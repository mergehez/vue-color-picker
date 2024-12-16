[![NPM Version](https://img.shields.io/npm/v/%40mergehez%2Fvue-color-picker)](https://www.npmjs.com/package/@mergehez/vue-color-picker)

# Lightweight Vue Color Picker Component

Since all color pickers I found were too large or too complex, I decided to create my own. I

The bundle size of the component is **9.3 KB** (minified) and **3.8 KB** (gzipped).

## Installation

```bash
npm install @mergehez/vue-color-picker
```
```bash
bun install @mergehez/vue-color-picker
```
```bash
pnpm install @mergehez/vue-color-picker
```

## Usage

```vue
<script setup>
  import ColorPicker from '@mergehez/vue-color-picker';
  import '@mergehez/vue-color-picker/styles.css';

  const color = ref('#ff0000');
</script>
<template>
  <div>
    <ColorPicker v-model="color" />
  </div>
</template>
```

> [!NOTE]
> Go to [ColorPicker.vue](https://github.com/mergehez/vue-color-picker/blob/main/src/components/ColorPicker.vue) for available props.


