/* @flow */

import { namespaceMap } from 'web/util/index'

/**
 * web平台的 dom 操作的api
 */

//根据tagname创建dom节点
export function createElement (tagName: string, vnode: VNode): Element {
  const elm = document.createElement(tagName)
  if (tagName !== 'select') {
    return elm
  }
  // false or null will remove the attribute but undefined will not
  // 为选择框添加多选属性
  if (vnode.data && vnode.data.attrs && vnode.data.attrs.multiple !== undefined) {
    elm.setAttribute('multiple', 'multiple')
  }
  return elm
}

//创建带命名空间的元素节点 若全局空间中已有同名对象，则不覆盖该对象；否则创建一个新的命名空间。
export function createElementNS (namespace: string, tagName: string): Element {
  return document.createElementNS(namespaceMap[namespace], tagName)
}

//创建文本节点
export function createTextNode (text: string): Text {
  return document.createTextNode(text)
}

//创建注释节点
export function createComment (text: string): Comment {
  return document.createComment(text)
}

//在指定节点前插入节点
export function insertBefore (parentNode: Node, newNode: Node, referenceNode: Node) {
  parentNode.insertBefore(newNode, referenceNode)
}

//移除子节点
export function removeChild (node: Node, child: Node) {
  node.removeChild(child)
}

export function appendChild (node: Node, child: Node) {
  node.appendChild(child)
}

//返回节点的父节点
export function parentNode (node: Node): ?Node {
  return node.parentNode
}

//返回指定节点的下一个兄弟节点
export function nextSibling (node: Node): ?Node {
  return node.nextSibling
}

export function tagName (node: Element): string {
  return node.tagName
}

//为节点设置文本
export function setTextContent (node: Node, text: string) {
  node.textContent = text
}

//为节点创建scopeId属性
export function setStyleScope (node: Element, scopeId: string) {
  node.setAttribute(scopeId, '')
}
