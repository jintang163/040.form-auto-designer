export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/formFill/index',
    'pages/sync/index',
    'pages/mine/index',
    'pages/formDetail/index',
    'pages/templateDetail/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#165dff',
    navigationBarTitleText: '离线表单',
    navigationBarTextStyle: 'white',
    backgroundColor: '#f5f6f7'
  },
  tabBar: {
    color: '#86909c',
    selectedColor: '#165dff',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '任务大厅'
      },
      {
        pagePath: 'pages/formFill/index',
        text: '表单填写'
      },
      {
        pagePath: 'pages/sync/index',
        text: '数据同步'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
})
