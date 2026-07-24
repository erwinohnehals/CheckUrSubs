// ─── Переводы ─────────────────────────────────────────────────────────────────

export const translations = {
  ru: {
    // Навигация
    nav_home:      'Главная',
    nav_calendar:  'Календарь',
    nav_analytics: 'Аналитика',

    // Главная
    per_month:     'В месяц',
    per_year:      'За год',
    per_day:       'В день',
    active_count:  (n) => `${n} активных`,
    paused_count:  (n) => `${n} на паузе`,
    trial_count:   (n) => `${n} пробных`,
    all_subs:      'Все подписки',
    search_placeholder: 'Поиск...',
    swipe_hint:    '← свайп для удаления · свайп для редактирования →',
    sort_az:       'А–Я',
    sort_price:    'Цена',
    sort_date:     'Дата',
    add_sub:       'Добавить подписку',
    add_first_sub: 'Добавить первую подписку',
    empty_title:   'Пока тут пусто',
    empty_subtitle:'Самое время вспомнить, за что платишь каждый месяц',
    nothing_found: (q) => `Ничего не найдено по «${q}»`,

    // Push баннер
    push_title:    'Напоминания о платежах',
    push_subtitle: 'Уведомим за 3 дня до списания',
    push_enable:   'Включить',

    // Toast
    sub_deleted:   'Подписка удалена',
    sub_delete:    'Удалить',
    undo:          'Отменить',

    // Календарь
    calendar_title: 'Календарь',
    expected:      (month) => `Ожидается в ${month}`,
    spent:         (month) => `Потрачено в ${month}`,
    soon:          'Скоро',
    soon_empty:    'Ближайшие 7 дней — без списаний',

    // Импорт / Экспорт
    io_title:          'Данные',
    io_subtitle:       'Хранятся только на этом устройстве',
    io_export:         'Экспорт',
    io_export_csv:     'Скачать CSV',
    io_export_json:    'Скачать JSON',
    io_import:         'Импорт',
    io_import_hint:    'CSV или JSON',
    io_import_btn:     'Выбрать файл',
    io_import_ok:      (n) => `Импортировано: ${n}`,
    io_import_err:     'Ошибка формата файла',
    io_import_dup:     (n) => `Пропущено дублей: ${n}`,

    // Auth
    auth_tagline:       'Контроль подписок под рукой',
    auth_title_login:   'Добро пожаловать',
    auth_title_register:'Создать аккаунт',
    auth_title_reset:   'Сброс пароля',
    auth_google_login:  'Войти через Google',
    auth_google_register:'Зарегистрироваться через Google',
    auth_or:            'или',
    auth_email:         'Email',
    auth_password:      'Пароль',
    auth_btn_login:     'Войти',
    auth_btn_register:  'Зарегистрироваться',
    auth_btn_reset:     'Отправить ссылку',
    auth_no_account:    'Нет аккаунта?',
    auth_have_account:  'Уже есть аккаунт?',
    auth_forgot:        'Забыл пароль',
    auth_back:          '← Назад ко входу',
    auth_confirm_email: 'Проверь почту — отправили письмо для подтверждения.',
    auth_reset_sent:    'Ссылка для сброса пароля отправлена на почту.',
    auth_err_invalid:   'Неверный email или пароль.',
    auth_err_unconfirmed:'Подтверди email — письмо уже у тебя в почте.',
    auth_err_exists:    'Этот email уже зарегистрирован.',
    auth_err_password:  'Пароль должен быть не менее 6 символов.',
    auth_err_rate:      'Слишком много попыток. Подожди немного.',

    // Аналитика
    analytics_title:    'Аналитика',
    by_categories:      'По категориям',
    by_subscriptions:   'По подпискам',
    trial_period:       'Пробный период',
    on_pause:           'На паузе',
    trend_title:        'Тренд расходов',

    // Модал
    modal_edit:         'Редактировать',
    modal_new:          'Новая подписка',
    modal_name_placeholder: 'Название (например, Netflix)',
    modal_price_placeholder: 'Цена',
    modal_monthly:      'В месяц',
    modal_yearly:       'В год',
    modal_status_active:'Активна',
    modal_status_paused:'На паузе',
    modal_status_trial: 'Пробный',
    modal_trial_end:    'Окончание пробного периода',
    modal_billing_date: 'Дата списания',
    modal_billing_day:  'Число списания',
    modal_day_placeholder:   'День',
    modal_day_billing_placeholder: 'День списания',
    modal_save:         'Сохранить',
    modal_add:          'Добавить',
    modal_cancel:       'Отмена',

    // Строка подписки
    sub_per_month: 'мес',
    sub_per_year:  'год',

    // Поддержка
    support_title:    'Поддержать разработчика',
    support_subtitle: 'Приложение бесплатное и всегда будет таким',
    support_open:     'Открыть →',
    support_copy:     'Скопировать адрес',
    support_copied:   '✓ Скопировано',
    support_word:     'Добрым словом',
    support_word_placeholder: 'Напишите что думаете...',
    support_word_sending: 'Отправляем...',
    support_word_send:    'Отправить →',
    support_word_thanks:  '❤️ Спасибо, это важно!',
    support_word_error:   'Ошибка, попробуйте позже',

    // Аватар меню
    logout: 'Выйти',

    delete_account: 'Удалить аккаунт',
    delete_account_title: 'Удалить аккаунт?',
    delete_account_desc: 'Все подписки и данные будут удалены навсегда. Это действие нельзя отменить.',
    delete_type_to_confirm: 'Введите {word} для подтверждения',
    delete_account_confirm: 'Удалить всё',
    delete_account_loading: 'Удаляем...',

    // Категории
    cat_entertainment: 'Развлечения',
    cat_work:          'Работа',
    cat_internet:      'Интернет',
    cat_games:         'Игры',
    cat_education:     'Обучение',
    cat_vpn:           'VPN',
    cat_health:        'Здоровье',
    cat_banking:       'Банкинг',
    cat_telecom:       'Связь',
    cat_ai:            'ИИ',
    cat_other:         'Другое',

    // Даты
    months_full:    ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
    months_genitive:['январе','феврале','марте','апреле','мае','июне','июле','августе','сентябре','октябре','ноябре','декабре'],
    days_short:     ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'],

    // Онбординг
    onb_skip: 'Пропустить',
    onb_next: 'Далее',
    // PWA инструкция
    pwa_ios_share: 'Нажми «Поделиться»',
    pwa_ios_share_hint: 'Кнопка внизу браузера',
    pwa_ios_add: '«На экран «Домой»»',
    pwa_ios_add_hint: 'Прокрути список вниз',
    pwa_android_menu: 'Меню браузера',
    pwa_android_menu_hint: 'Три точки справа вверху',
    pwa_android_install: '«Установить приложение»',
    pwa_android_install_hint: 'Или «Добавить на гл. экран»',
    // Статус бейджи
    badge_paused: 'пауза',
    badge_trial:  'пробный',
    // DatePicker
    datepicker_choose: 'Выбрать дату',
    // Calendar
    not_billing: 'не списывается',
    onb_slides: [
      {
        title: 'Привет!',
        subtitle: 'CheckUrSubs поможет отслеживать все подписки в одном месте — сколько тратишь, когда списывается и на что уходят деньги.',
      },
      {
        title: 'Добавляй подписки',
        subtitle: 'Нажми «Добавить подписку». Введи название — приложение само подскажет сервис и подставит категорию. Укажи сумму и дату списания.',
      },
      {
        title: 'Управляй подписками',
        subtitle: 'Свайп влево — удалить. Свайп вправо — редактировать.',
      },
      {
        title: 'Следи за датами',
        subtitle: 'Вкладка «Календарь» покажет, в какие дни месяца и сколько списывается. Вкладка «Скоро» на главной — ближайшие 7 дней.',
      },
      {
        title: 'Анализируй расходы',
        subtitle: 'Вкладка «Аналитика» разбивает траты по категориям и сервисам. Выбери удобную валюту — курс обновляется автоматически.',
      },
      {
        title: 'Установи приложение',
        subtitle: 'Добавь на экран домой — работает как обычное приложение, без адресной строки браузера.',
      },
    ],
  },

  en: {
    // Navigation
    nav_home:      'Home',
    nav_calendar:  'Calendar',
    nav_analytics: 'Analytics',

    // Home
    per_month:     'Per month',
    per_year:      'Per year',
    per_day:       'Per day',
    active_count:  (n) => `${n} active`,
    paused_count:  (n) => `${n} paused`,
    trial_count:   (n) => `${n} trial`,
    all_subs:      'All subscriptions',
    search_placeholder: 'Search...',
    swipe_hint:    '← swipe to delete · swipe to edit →',
    sort_az:       'A–Z',
    sort_price:    'Price',
    sort_date:     'Date',
    add_sub:       'Add subscription',
    add_first_sub: 'Add first subscription',
    empty_title:   'Nothing here yet',
    empty_subtitle:'A good time to remember what you\'re paying for',
    nothing_found: (q) => `Nothing found for "${q}"`,

    // Push banner
    push_title:    'Payment reminders',
    push_subtitle: "We'll notify you 3 days before billing",
    push_enable:   'Enable',

    // Toast
    sub_deleted:   'Subscription deleted',
    sub_delete:    'Delete',
    undo:          'Undo',

    //Delete confirm
    delete_confirm_hint: 'Вы уверены?',
    delete_confirm_hint: "Are you sure?",

    // Calendar
    calendar_title: 'Calendar',
    expected:      (month) => `Expected in ${month}`,
    spent:         (month) => `Spent in ${month}`,
    soon:          'Upcoming',
    soon_empty:    'No payments in the next 7 days',

    // Импорт / Экспорт
    io_title:          'Данные',
    io_subtitle:       'Хранятся только на этом устройстве',
    io_export:         'Экспорт',
    io_export_csv:     'Скачать CSV',
    io_export_json:    'Скачать JSON',
    io_import:         'Импорт',
    io_import_hint:    'CSV или JSON из CheckUrSubs',
    io_import_btn:     'Выбрать файл',
    io_import_ok:      (n) => `Импортировано: ${n}`,
    io_import_err:     'Ошибка формата файла',
    io_import_dup:     (n) => `Пропущено дублей: ${n}`,


    // Офлайн
    offline_banner: 'Нет соединения — изменения недоступны',

    // Offline
    offline_banner: 'No connection — changes unavailable',

    // Import / Export
    io_title:          'Data',
    io_subtitle:       'Stored only on this device',
    io_export:         'Export',
    io_export_csv:     'Download CSV',
    io_export_json:    'Download JSON',
    io_import:         'Import',
    io_import_hint:    'CSV or JSON',
    io_import_btn:     'Choose file',
    io_import_ok:      (n) => `Imported: ${n}`,
    io_import_err:     'Invalid file format',
    io_import_dup:     (n) => `Skipped duplicates: ${n}`,

    // Auth
    auth_tagline:       'Track all your subscriptions',
    auth_title_login:   'Welcome back',
    auth_title_register:'Create account',
    auth_title_reset:   'Reset password',
    auth_google_login:  'Continue with Google',
    auth_google_register:'Sign up with Google',
    auth_or:            'or',
    auth_email:         'Email',
    auth_password:      'Password',
    auth_btn_login:     'Sign in',
    auth_btn_register:  'Create account',
    auth_btn_reset:     'Send reset link',
    auth_no_account:    'No account?',
    auth_have_account:  'Already have an account?',
    auth_forgot:        'Forgot password',
    auth_back:          '← Back to sign in',
    auth_confirm_email: 'Check your inbox — we sent a confirmation email.',
    auth_reset_sent:    'Password reset link sent to your email.',
    auth_err_invalid:   'Invalid email or password.',
    auth_err_unconfirmed:'Please confirm your email — check your inbox.',
    auth_err_exists:    'This email is already registered.',
    auth_err_password:  'Password must be at least 6 characters.',
    auth_err_rate:      'Too many attempts. Please wait a moment.',

    // Analytics
    analytics_title:    'Analytics',
    by_categories:      'By category',
    by_subscriptions:   'By subscription',
    trial_period:       'Trial period',
    on_pause:           'Paused',
    trend_title:        'Spending trend',

    // Modal
    modal_edit:         'Edit',
    modal_new:          'New subscription',
    modal_name_placeholder: 'Name (e.g. Netflix)',
    modal_price_placeholder: 'Price',
    modal_monthly:      'Monthly',
    modal_yearly:       'Yearly',
    modal_status_active:'Active',
    modal_status_paused:'Paused',
    modal_status_trial: 'Trial',
    modal_trial_end:    'Trial end date',
    modal_billing_date: 'Billing date',
    modal_billing_day:  'Billing day',
    modal_day_placeholder:   'Day',
    modal_day_billing_placeholder: 'Billing day',
    modal_save:         'Save',
    modal_add:          'Add',
    modal_cancel:       'Cancel',

    // Subscription row
    sub_per_month: 'mo',
    sub_per_year:  'yr',

    // Support
    support_title:    'Support the developer',
    support_subtitle: 'The app is free and always will be',
    support_open:     'Open →',
    support_copy:     'Copy address',
    support_copied:   '✓ Copied',
    support_word:     'Kind words',
    support_word_placeholder: 'Write what you think...',
    support_word_sending: 'Sending...',
    support_word_send:    'Send →',
    support_word_thanks:  '❤️ Thank you, it matters!',
    support_word_error:   'Error, please try again',

    // Avatar menu
    logout: 'Log out',

    delete_account: 'Delete account',
    delete_account_title: 'Delete account?',
    delete_account_desc: 'All your subscriptions and data will be permanently erased. This cannot be undone.',
    elete_confirm_word: 'DELETE',
    delete_type_to_confirm: 'Type {word} to confirm',
    delete_account_confirm: 'Delete everything',
    delete_account_loading: 'Deleting...',

    // Categories
    cat_entertainment: 'Entertainment',
    cat_work:          'Work',
    cat_internet:      'Internet',
    cat_games:         'Games',
    cat_education:     'Education',
    cat_vpn:           'VPN',
    cat_health:        'Health',
    cat_banking:       'Banking',
    cat_telecom:       'Mobile',
    cat_ai:            'AI',
    cat_other:         'Other',

    // Dates
    months_full:    ['January','February','March','April','May','June','July','August','September','October','November','December'],
    months_genitive:['January','February','March','April','May','June','July','August','September','October','November','December'],
    days_short:     ['Mo','Tu','We','Th','Fr','Sa','Su'],

    // Onboarding
    onb_skip: 'Skip',
    onb_next: 'Next',
    // PWA instructions
    pwa_ios_share: 'Tap "Share"',
    pwa_ios_share_hint: 'Button at the bottom of Safari',
    pwa_ios_add: '"Add to Home Screen"',
    pwa_ios_add_hint: 'Scroll down in the menu',
    pwa_android_menu: 'Browser menu',
    pwa_android_menu_hint: 'Three dots in top right',
    pwa_android_install: '"Install app"',
    pwa_android_install_hint: 'Or "Add to Home screen"',
    // Status badges
    badge_paused: 'paused',
    badge_trial:  'trial',
    // DatePicker
    datepicker_choose: 'Choose date',
    // Calendar
    not_billing: 'not billing',
    onb_slides: [
      {
        title: 'Welcome!',
        subtitle: "CheckUrSubs helps you track all your subscriptions in one place — how much you spend, when you're billed, and where the money goes.",
      },
      {
        title: 'Add subscriptions',
        subtitle: 'Tap "Add subscription". Enter a name — the app will suggest the service and fill in the category. Set the amount and billing date.',
      },
      {
        title: 'Manage subscriptions',
        subtitle: 'Swipe left to delete. Swipe right to edit.',
      },
      {
        title: 'Track billing dates',
        subtitle: "The Calendar tab shows which days of the month you're billed and how much. The Upcoming section shows the next 7 days.",
      },
      {
        title: 'Analyze spending',
        subtitle: 'The Analytics tab breaks down expenses by category and service. Choose your currency — rates update automatically.',
      },
      {
        title: 'Install the app',
        subtitle: 'Add to your home screen — works like a native app, no browser address bar.',
      },
    ],
  },
};

// ─── Хук ──────────────────────────────────────────────────────────────────────
import { createContext, useContext } from 'react';

export const LangContext = createContext('ru');

export const useLang = () => useContext(LangContext);

export const useT = () => {
  const lang = useLang();
  return translations[lang] || translations.ru;
};
