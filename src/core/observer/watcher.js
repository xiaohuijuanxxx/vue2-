/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  invokeWithErrorHandling,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * 当依赖变化的时候触发回调
 * This is used for both the $watch() api and directives.
 * 1.实例化watcher的时候，会先执行其构造函数 constructer
 * 2.在构造函数中调用 this.get()实例方法
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
    }
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers

    // Watcher 是一个 Class，在它的构造函数中，定义了一些和 Dep 相关的属性：
    // deps 和 newDeps 表示watcher实例持有的dep 实例数组
    // 谁用到了这个数据，就为谁创建一个watcher 实例化watcher的时候会将自己放到这个依赖管理器中，数据发生变化的时候，就会通知wather, watcher就会去通知真正的依赖
    this.deps = []
    this.newDeps = []
    //对应连个数组的set结构
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }

    //实例化watcher的时候，调用构造函数的get方法
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  get () {
    //实际上就是把 Dep.target 赋值为当前的渲染 watcher 并压栈（为了恢复用）。
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      //this.getter在上文中定义了，就是传进来的expOrFn函数 也就是updataComponent函数  在$mount的时候 调用了new Watcher()
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      // 如果设置了deep属性，每一个属性都能进行深度监听
      if (this.deep) {
        traverse(value)
      }
      //Dep.target 出栈 实际上就是把 Dep.target 恢复成上一个状态，因为当前 vm 的数据依赖收集已经完成，那么对应的渲染Dep.target 也需要改变。最后执行
      popTarget()

      // 依赖清空
      /**
       * 考虑到 Vue 是数据驱动的，
       * 所以每次数据变化都会重新 render，那么 vm._render() 方法又会再次执行，
       * 并再次触发数据的 getters，所以 Watcher 在构造函数中会初始化 2 个 Dep 实例数组，
       * newDeps 表示新添加的 Dep 实例数组，而 deps 表示上一次添加的 Dep 实例数组。
       * 当v-if的时候，访问a数据时getter进行了依赖收集，条件改变后 v-if 条件变为了b展示，getter对b进行了依赖收集
       * 这个时候就需要清空a的依赖，否则修改a的时候仍然会通知订阅者watcher 进行回调 会造成资源浪费
       */
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   * 这时候会做一些逻辑判断（保证同一数据不会被添加多次）
   */
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        //调用dep的addSub方法，将watcher收集到dep类的subs数组中，为了数据更新的时候，知道要通知哪些watcher
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   * 在执行 cleanupDeps 函数的时候，会首先遍历 deps，移除对 dep.subs 数组中 Wathcer 的订阅，
   * 然后把 newDepIds 和 depIds 交换，newDeps 和 deps 交换，并把 newDepIds 和 newDeps 清空。
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    /**
     * computed的情况，数据变化之后才会进行计算
     * dirty就是一个开关：开关为true的时候才会进行计算
     */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      //一般组件的数据更新都是走这个逻辑
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    if (this.active) {
      const value = this.get()
      if (
        // 新值旧值不同、新值是对象、deep模式则执行watcher的回调函数
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        // 即使值相同，深度观察者和对象/数组上的观察者也应该触发，因为值可能已经发生了变化。
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          const info = `callback for watcher "${this.expression}"`
          // cbd代表回调函数 callback
          invokeWithErrorHandling(this.cb, this.vm, [value, oldValue], this.vm, info)
        } else {
          // 注意回调函数执行的时候会把第一个和第二个参数传入新值 value 和旧值 oldValue，
          // 这就是当我们添加自定义 watcher 的时候能在回调函数的参数中拿到新旧值的原因。
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
