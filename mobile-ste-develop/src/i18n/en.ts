const en = {
  common: {
    ok: "OK!",
    cancel: "Cancel",
    back: "Back",
    retry: "Retry",
    save_success: "Saved",
    save_failed: "Save failed",
    empty: "No data",
  },
  welcomeScreen: {
    postscript:
      "psst  — This probably isn't what your app looks like. (Unless your designer handed you these screens, and in that case, ship it!)",
    readyForLaunch: "Your app, almost ready for launch!",
    exciting: "(ohh, this is exciting!)",
  },
  errorScreen: {
    title: "Something went wrong!",
    friendlySubtitle:
      "This is the screen that your users will see in production when an error is thrown. You'll want to customize this message (located in `app/i18n/en.ts`) and probably the layout as well (`app/screens/ErrorScreen`). If you want to remove this entirely, check `app/app.tsx` for the <ErrorBoundary> component.",
    reset: "RESET APP",
  },
  emptyStateComponent: {
    generic: {
      heading: "So empty... so sad",
      content: "No data found yet. Try clicking the button to refresh or reload the app.",
      button: "Let's try this again",
    },
  },
  home: {
    template_button: "Template",
    new_button: "Create",
    hello_text: "Hello{{name}}",
  },
  login: {
    title: "Login",
    button_QR: "Login with QR",
    button_code: "Login with parse code",
    login_pin_label: "Please enter the issued pass code",
    login_error: "Login error",
    logging: "Login...",
    logout: "Logout",
    offline_cannot_logout: "Cannot logout while offline. Please connect to the internet.",
  },
  edit: {
    project_name: "Project Name",
    project_placeholder: "yyyymmdd\${Student name}+\$ {Title of distributed work} .sjr",
    edit: "Edit",
  },
  classes: {
    class_name_and_amount: "{{name}} （{{amount}}people）",
    school_title: "Sunflower garden",
  },
  error: {
    forbidden: "Forbidden",
    unauthorized: "Unauthorized",
    error_message_default: "An error has occurred",
  },
  works: {
    created_at: "Created at",
    teacher_works: "Teacher's work",
    assign_work: "Send to everyone",
    selected_works: "Selected {{count}} works",
    updated_at: "Updated at",
    my_own_work: "My own work",
    lessons_from_teacher: "Lessons from teacher",
    copy_and_create: "Copy and create",
    assign_success: "Successfully sent to everyone",
    choose: "Choose",
    deselect: "Deselect",
  },
  menu: {
    class_list: "class list",
    template: "template",
    teacher_works: "Teacher's work",
  },
  students: {
    online: "Online",
    offline: "Offline",
    enrolled_student: "Number of people enrolled",
  },
}

export default en
export type Translations = typeof en
