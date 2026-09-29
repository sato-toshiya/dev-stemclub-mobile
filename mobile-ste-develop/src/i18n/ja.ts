import { Translations } from "./en"

const ja: Translations = {
  common: {
    ok: "OK",
    cancel: "キャンセル",
    back: "戻る",
    retry: "リトライ",
    save_success: "保存しました。",
    save_failed: "保存に失敗しました。",
    empty: "担当クラスが設定されていません",
  },
  welcomeScreen: {
    postscript:
      "注目！ — このアプリはお好みの見た目では無いかもしれません(デザイナーがこのスクリーンを送ってこない限りは。もしそうなら公開しちゃいましょう！)",
    readyForLaunch: "このアプリはもう少しで公開できます！",
    exciting: "(楽しみですね！)",
  },
  errorScreen: {
    title: "問題が発生しました",
    friendlySubtitle:
      "本番では、エラーが投げられた時にこのページが表示されます。もし使うならこのメッセージに変更を加えてください(`app/i18n/jp.ts`)レイアウトはこちらで変更できます(`app/screens/ErrorScreen`)。もしこのスクリーンを取り除きたい場合は、`app/app.tsx`にある<ErrorBoundary>コンポーネントをチェックしてください",
    reset: "リセット",
  },
  emptyStateComponent: {
    generic: {
      heading: "静かだ...悲しい。",
      content:
        "データが見つかりません。ボタンを押してアプリをリロード、またはリフレッシュしてください。",
      button: "もう一度やってみよう",
    },
  },
  home: {
    template_button: "てんぷれーと",
    new_button: "さくせい",
    hello_text: "こんにちは{{name}}",
  },
  login: {
    title: "ログイン!",
    button_QR: "QRでログイン",
    button_code: "コードでログイン",
    login_pin_label: "発行されたパースコードを入力してください",
    login_error: "ログインエラー",
    logging: "サインイン中...",
    logout: "ログアウト",
    offline_cannot_logout: "オフラインではログアウトできません。インターネットに接続してください。",
  },
  edit: {
    project_name: "プロジェクトめい",
    project_placeholder: " yyyymmdd\${生徒名}+\$ {配布した作品のタイトル} .sjr",
    edit: "ほぞん",
  },
  classes: {
    class_name_and_amount: "{{name}} （{{amount}}名）",
    school_title: "ひまわり幼稚園",
  },
  error: {
    forbidden: "禁止",
    unauthorized: "未承認",
    error_message_default: "エラーが発生しました",
  },
  works: {
    created_at: "作成日",
    teacher_works: "せんせいのさくひん",
    assign_work: "みんなに送る",
    selected_works: "選択中　{{count}}件",
    my_own_work: "じぶんのさくひん",
    updated_at: "きょうゆうび",
    lessons_from_teacher: "せんせいからのれっしゅん",
    copy_and_create: "こぴーしてさくせい",
    assign_success: "全員への送信に成功しました",
    choose: "選択する",
    deselect: "選択解除する",
  },
  menu: {
    class_list: "クラス名簿",
    template: "てんぷれーと",
    teacher_works: "せんせいのさくひん",
  },
  students: {
    online: "オンライン",
    offline: "オフライン",
    enrolled_student: "在籍人数",
  },
}

export default ja
