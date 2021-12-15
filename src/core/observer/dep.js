/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * dep是一个可观察对象，可以有多个指令订阅它。
 * Dep 是一个 Class，它定义了一些属性和方法，这里需要特别注意的是它有一个静态属性 target，这是一个全局唯一 Watcher，这是
 * 个非常巧妙的设计，因为在同一时间=============只能有一个全局的 Watcher 被计算============，
 * 另外它的自身属性 subs 也是 Watcher 的数组。
Dep 实际上就是对 Watcher 的一种管理，Dep 脱离 Watcher 单独存在是没有意义的，为了完整地讲清楚依赖收集过程，我们有必要看一下 Watcher 的一些相关实现，它的定义在 src/core/observer/watcher.js 中
 */
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    //subs用来存放依赖的数组
    this.subs = []
  }

  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  //删除依赖
  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  //添加依赖
  depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  //通知依赖更新
  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null
const targetStack = []

export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
