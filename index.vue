<template>
  <div class="component-Home-view">
    <el-input v-model="myInfo.name"></el-input>
  </div>
</template>
<script>
export default {
  name: "Home",
  components: {},
  props: {
    msg: {
      type: String,
      default: "Welcome to Your Vue.js App",
    },
    info: {
      type: Object,
      default: () => {
        return {
          name: "Vue",
          version: "2.6.11",
        };
      },
    },
  },
  computed: {
    computedMsg() {
      return this.msg + "!";
    },
  },
  data() {
    return {
      myInfo: {
        name: "Vue",
        version: "2.6.11",
      },
    };
  },
  methods: {
    handleClick() {
      console.log("clicked");
    },
  },
};
</script>

<style lang="scss" scoped>
.component-Home-view {
  color: red;
}
</style>
