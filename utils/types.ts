import { ClassMethod } from '@babel/types'

export type ComputedFunItem = {
  getNode?: ClassMethod;
  setNode?: ClassMethod;
  name: string;
  hasToVue3?: boolean; // isProcessed是否已经被处理为vue3了
}

export interface vmContentType {
  computedFun: ComputedFunItem[];
  emitsTypes: string[];
  watchFunNames: string[];
  methodsFunNames: string[];
  propsNames: string[];
  stateDataNames: string[];
  // setup的Return语句的内容
  setupReturnContent: string[],
  refsNames: string[],
  initExpressions: string[], // 初始化的代码，也就是在setup的return之前执行的代码。 // =
}
