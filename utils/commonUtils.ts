// 把字符串的第一个字符变为大写
export function capitalizeFirstLetter(string) {
  if (typeof string !== 'string') {
    return string
  }
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export function mergeArray(from: any[], to: any[]) {
  if (!(Array.isArray(from) && from.length && Array.isArray(to))) {
    return
  }
  for (let i = 0, il = from.length; i < il; i++) {
    // 如果to里没有，才插入。
    if (to.indexOf(from[i]) === -1) {
      to.push(from[i])
    }
  }
}

// 把trailingComment和leadingCOmments整合到comments里面。这样在generate()生成代码时，才能保留注释
// @isPlainNode: true：是原始node，而不是用gogocdoe的$的生成的对象
// @nodeAst，不能是ast，要是原始的node
export function mergeTrailingAndLeadingComments(nodeAst: any) {
  if (!nodeAst) {
    return
  }

  nodeAst.comments = nodeAst.comments || []
  if (nodeAst.leadingComments) {
    mergeArray(nodeAst.leadingComments, nodeAst.comments)
    // nodeAst.comments.push(...(nodeAst.leadingComments || []))
  }
  if (nodeAst.trailingComments) {
    mergeArray(nodeAst.trailingComments, nodeAst.comments)
    // nodeAst.comments.push(...(nodeAst.trailingComments || []))
  }
  if (nodeAst.innerComments) {
    mergeArray(nodeAst.innerComments, nodeAst.comments)
    // nodeAst.comments.push(...(nodeAst.innerComments || []))
  }
  // if (!nodeAst.attr('comments')) {
  //   if (nodeAst.attr('leadingComments')) {
  //     nodeAst.append('comments', nodeAst.attr('leadingComments'))
  //   }
  //   if (nodeAst.attr('trailingComments')) {
  //     nodeAst.append('comments', nodeAst.attr('trailingComments'))
  //   }
  //   if (nodeAst.attr('innerComments')) {
  //     nodeAst.append('comments', nodeAst.attr('innerComments'))
  //   }
  // }
}

export function mergeTrailingAndLeadingCommentsArr(nodeAstList: any[]) {
  if (!(Array.isArray(nodeAstList) && nodeAstList.length)) {
    return
  }
  for (let i = 0, il = nodeAstList.length; i < il; i++) {
    mergeTrailingAndLeadingComments(nodeAstList[i])
  }
}

// 把comment从from浅拷贝到to
// @from 和 @to，不能是ast，要是原始的node
export function copyCommentsFromAToB(from: any, to: any) {
  if (!from || !to) {
    return
  }
  if (Array.isArray(from.trailingComments) && from.trailingComments.length) {
    // 防止为空
    to.trailingComments = to.trailingComments || []
    mergeArray(from.trailingComments, to.trailingComments)
  }
  if (Array.isArray(from.leadingComments) && from.leadingComments.length) {
    // 防止为空
    to.leadingComments = to.leadingComments || []
    mergeArray(from.leadingComments, to.leadingComments)
  }
  if (Array.isArray(from.innerComments) && from.innerComments.length) {
    // 防止为空
    to.innerComments = to.innerComments || []
    mergeArray(from.innerComments, to.innerComments)
  }
  if (Array.isArray(from.comments) && from.comments.length) {
    // 防止为空
    to.comments = to.comments || []
    mergeArray(from.comments, to.comments)
  }
}

// 从html的tag属性里，利用正则pickerOptionsReg，找到指定的属性
export function findHtmlAttrByReg<T = any>(
  pickerOptionsReg: RegExp, attrArr: T[], $?: any) {
  if (!(Array.isArray(attrArr) && attrArr.length && pickerOptionsReg)) {
    return
  }
  // const pickerOptionsReg = /^(v-bind:|:|)picker-options$/
  let attr
  let pickerOptions
  for (let i = attrArr.length - 1; i >= 0; i--) {
    attr = attrArr[i]
    if (!attr.key || !attr.key.content) {
      continue
    }
    if (pickerOptionsReg.test(attr.key.content) && attr.key.content) {
      pickerOptions = attrArr[i]
      return {
        attr: pickerOptions,
        index: i
      }
    }
  }
}

// 向contArr里push数据content
export function pushToContentArr<T = string>(content: T, contArr: T[]) {
  if (!Array.isArray(contArr) || content === undefined || content === null) {
    return
  }
  // 去重
  if (contArr.indexOf(content) === -1) {
    contArr.push(content)
  }
}
