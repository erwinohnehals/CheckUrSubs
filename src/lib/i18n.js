// ─── Übersetzungen ────────────────────────────────────────────────────────────

export const APP_NAME = 'Gold&Geld';

export const LANGS = ['de', 'en'];

export const translations = {
  de: {
    // Navigation
    nav_home:      'Übersicht',
    nav_calendar:  'Kalender',
    nav_analytics: 'Auswertung',

    // Desktop
    home_subtitle:      'Verträge, Abos und laufende Kosten an einem Ort',
    calendar_subtitle:  'Wann wie viel abgebucht wird',
    analytics_subtitle: 'Wohin das Geld geht',
    today:              'Heute',
    more_count:         (n) => `${n} weitere`,

    // Übersicht
    per_month:     'Pro Monat',
    per_year:      'Pro Jahr',
    per_day:       'Pro Tag',
    active_count:  (n) => `${n} aktiv`,
    paused_count:  (n) => `${n} pausiert`,
    trial_count:   (n) => `${n} Testphase`,
    all_subs:      'Alle Einträge',
    search_placeholder: 'Suchen...',
    swipe_hint:    '← wischen zum Löschen · wischen zum Bearbeiten →',
    sort_az:       'A–Z',
    sort_price:    'Betrag',
    sort_date:     'Datum',
    add_sub:       'Eintrag hinzufügen',
    add_first_sub: 'Ersten Eintrag hinzufügen',
    empty_title:   'Noch nichts erfasst',
    empty_subtitle:'Höchste Zeit zu sammeln, was jeden Monat abgeht — Strom, Versicherung, Handy, Abos',
    nothing_found: (q) => `Nichts gefunden für „${q}“`,

    // Toast
    sub_deleted:   'Eintrag gelöscht',
    sub_delete:    'Löschen',
    sub_per_month: 'Mon.',
    sub_per_year:  'Jahr',
    undo:          'Rückgängig',
    delete_confirm_hint: 'Dokumente und Zugangsdaten werden mit gelöscht.',

    // Kalender
    calendar_title: 'Kalender',
    expected:      (month) => `Erwartet im ${month}`,
    spent:         (month) => `Ausgegeben im ${month}`,
    soon:          'Demnächst',
    soon_empty:    'Keine Abbuchungen in den nächsten 7 Tagen',
    not_billing:   'keine Abbuchung',

    // Kündigungsfristen
    deadlines_title:   'Kündigungsfristen',
    deadlines_empty:   'Keine Frist in den nächsten 90 Tagen',
    deadline_until:    'Kündigen bis',
    deadline_days:     (n) => `noch ${n} Tage`,
    deadline_today:    'heute',
    deadline_tomorrow: 'morgen',
    deadline_passed:   'Frist verstrichen',

    // Import / Export
    io_title:          'Daten',
    io_subtitle:       'Bleiben auf diesem Gerät',
    io_export:         'Export',
    io_import:         'Import',
    io_import_hint:    'CSV oder JSON',
    io_import_btn:     'Datei wählen',
    io_import_ok:      (n) => `Importiert: ${n}`,
    io_import_err:     'Dateiformat nicht lesbar',
    io_docs_note:      'Dokumente werden nicht exportiert',

    // Auswertung
    analytics_title:    'Auswertung',
    by_categories:      'Nach Kategorie',
    by_subscriptions:   'Nach Eintrag',
    trial_period:       'Testphase',
    on_pause:           'Pausiert',
    trend_title:        'Kostenverlauf',
    trend_unit:         'M',
    trend_last:         (n) => `Letzte ${n} Monate`,

    // Modal
    modal_edit:         'Bearbeiten',
    modal_new:          'Neuer Eintrag',
    modal_name_placeholder: 'Name (z. B. Stromvertrag)',
    modal_provider_placeholder: 'Anbieter (z. B. E.ON)',
    modal_price_placeholder: 'Betrag',
    modal_monthly:      'Monatlich',
    modal_yearly:       'Jährlich',
    modal_status_active:'Aktiv',
    modal_status_paused:'Pausiert',
    modal_status_trial: 'Testphase',
    modal_trial_end:    'Ende der Testphase',
    modal_billing_date: 'Abbuchungsdatum',
    modal_billing_day:  'Abbuchungstag',
    modal_day_placeholder:   'Tag',
    modal_day_billing_placeholder: 'Abbuchungstag',
    modal_month_placeholder: 'Monat',
    modal_save:         'Speichern',
    modal_add:          'Hinzufügen',
    modal_cancel:       'Abbrechen',
    modal_notes:        'Notizen',
    modal_notes_placeholder: 'Was du sonst noch wissen willst...',

    // Modal-Reiter
    tab_basics: 'Basis',
    tab_details:'Details',
    tab_access: 'Zugang',
    tab_docs:   'Dokumente',

    // Vertragsdaten
    contract_section:  'Vertragslaufzeit',
    contract_start:    'Vertragsbeginn',
    contract_end:      'Vertragsende',
    notice_period:     'Kündigungsfrist',
    notice_none:       'keine',
    notice_months:     (n) => `${n} Mon.`,
    auto_renew:        'Verlängert sich automatisch',
    cancel_by_hint:    (date) => `Kündigen bis ${date}`,
    details_template:  'Vertragsdaten',
    details_common:    'Abrechnung & Kontakt',
    details_empty:     'Wähle eine Kategorie, um passende Felder zu sehen',

    // Eigene Felder
    custom_fields:  'Eigene Felder',
    custom_add:     'Feld hinzufügen',
    custom_label:   'Bezeichnung',
    custom_value:   'Wert',
    custom_remove:  'Feld entfernen',
    type_text:      'Text',
    type_number:    'Zahl',
    type_date:      'Datum',
    type_money:     'Betrag',
    type_url:       'Link',
    type_secret:    'Geheim',
    type_textarea:  'Mehrzeilig',

    // Zugang
    access_url:       'Portal / Website',
    access_username:  'Benutzername / E-Mail',
    access_password:  'Passwort',
    access_note:      'Hinweis (z. B. 2FA, Sicherheitsfrage)',
    access_open:      'Öffnen',
    access_copy:      'Kopieren',
    access_show:      'Anzeigen',
    access_hide:      'Verbergen',

    // Tresor
    vault_title:        'Passwort-Tresor',
    vault_intro:        'Passwörter werden mit AES-GCM verschlüsselt. Der Schlüssel wird aus deinem Master-Passwort abgeleitet und nie gespeichert.',
    vault_warning:      'Vergisst du das Master-Passwort, sind die gespeicherten Zugangsdaten unwiderruflich verloren.',
    vault_passphrase:   'Master-Passwort',
    vault_repeat:       'Master-Passwort wiederholen',
    vault_create:       'Tresor anlegen',
    vault_unlock:       'Entsperren',
    vault_lock:         'Sperren',
    vault_locked:       'Tresor gesperrt',
    vault_locked_hint:  'Zum Anzeigen und Speichern von Passwörtern entsperren.',
    vault_wrong:        'Master-Passwort stimmt nicht',
    vault_mismatch:     'Die Eingaben stimmen nicht überein',
    vault_too_short:    'Mindestens 8 Zeichen',
    vault_unavailable:  'Verschlüsselung nicht verfügbar — die Seite muss über HTTPS laufen.',
    vault_reset:        'Tresor zurücksetzen',
    vault_reset_hint:   'Löscht alle gespeicherten Passwörter und legt das Master-Passwort neu fest.',
    vault_reset_confirm:'Alle gespeicherten Passwörter löschen?',
    vault_decrypt_err:  'Passwort konnte nicht entschlüsselt werden',

    // Dokumente
    docs_add:       'Datei hinzufügen',
    docs_empty:     'Noch keine Dokumente',
    docs_hint:      'Police, Vertrag, Rechnung — bleibt auf diesem Gerät',
    docs_open:      'Öffnen',
    docs_download:  'Herunterladen',
    docs_delete:    'Löschen',
    docs_too_large: (mb) => `Datei zu groß (max. ${mb} MB)`,
    docs_error:     'Datei konnte nicht gespeichert werden',
    docs_unavailable: 'Dateiablage in diesem Browser nicht verfügbar',
    docs_count:     (n) => `${n} Dokument${n === 1 ? '' : 'e'}`,

    // Kategorien
    cat_insurance:     'Versicherung',
    cat_health:        'Gesundheit',
    cat_energy:        'Strom & Gas',
    cat_water:         'Wasser & Abfall',
    cat_housing:       'Wohnen',
    cat_internet:      'Internet',
    cat_mobile:        'Mobilfunk',
    cat_transport:     'Mobilität',
    cat_broadcast:     'Rundfunkbeitrag',
    cat_banking:       'Bank & Finanzen',
    cat_fitness:       'Fitness',
    cat_membership:    'Mitgliedschaft',
    cat_entertainment: 'Unterhaltung',
    cat_work:          'Arbeit & Software',
    cat_ai:            'KI',
    cat_games:         'Spiele',
    cat_education:     'Bildung',
    cat_vpn:           'VPN',
    cat_other:         'Sonstiges',

    // Datum
    months_full:  ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
    months_short: ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],
    months_genitive: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
    days_short:   ['Mo','Di','Mi','Do','Fr','Sa','So'],
    datepicker_choose: 'Datum wählen',

    // Kündigungshilfe
    cancel_how:  'So kündigst du ',
    cancel_link: 'diesen Vertrag',

    // Unterstützung
    support_title:    'Entwicklung unterstützen',
    support_subtitle: 'Die App ist kostenlos und bleibt es',
    support_open:     'Öffnen →',
    support_copy:     'Adresse kopieren',
    support_copied:   '✓ Kopiert',

    // Statusbadges
    badge_paused: 'pausiert',
    badge_trial:  'Test',

    // Onboarding
    onb_skip: 'Überspringen',
    onb_next: 'Weiter',
    onb_manage_desktop: 'Mit der Maus über einen Eintrag fahren — Bearbeiten und Löschen erscheinen. Ein Klick auf die Zeile öffnet den Eintrag direkt.',
    pwa_ios_share: '„Teilen“ antippen',
    pwa_ios_share_hint: 'Button unten in Safari',
    pwa_ios_add: '„Zum Home-Bildschirm“',
    pwa_ios_add_hint: 'In der Liste nach unten scrollen',
    pwa_android_menu: 'Browser-Menü',
    pwa_android_menu_hint: 'Drei Punkte oben rechts',
    pwa_android_install: '„App installieren“',
    pwa_android_install_hint: 'Oder „Zum Startbildschirm“',
    pwa_desktop_install: `„${APP_NAME} installieren“`,
    pwa_desktop_install_hint: 'Installationssymbol in der Adressleiste',
    onb_slides: [
      {
        title: 'Willkommen!',
        subtitle: `${APP_NAME} sammelt Verträge, Abos und laufende Kosten an einem Ort — Versicherung, Strom, Internet, Handy und alles andere, das jeden Monat abgeht.`,
      },
      {
        title: 'Verträge erfassen',
        subtitle: 'Name eintippen — bekannte Anbieter schlägt die App vor und setzt die Kategorie. Dazu passende Felder: Versichertennummer, Zählernummer, Jahresverbrauch.',
      },
      {
        title: 'Einträge verwalten',
        subtitle: 'Nach links wischen zum Löschen, nach rechts zum Bearbeiten.',
      },
      {
        title: 'Fristen im Blick',
        subtitle: 'Vertragsende und Kündigungsfrist eintragen — die App rechnet aus, bis wann du kündigen musst, und erinnert dich rechtzeitig.',
      },
      {
        title: 'Unterlagen & Zugänge',
        subtitle: 'Policen und Rechnungen als Datei anhängen, Portal-Login im verschlüsselten Tresor ablegen. Alles bleibt auf diesem Gerät.',
      },
      {
        title: 'App installieren',
        subtitle: 'Zum Startbildschirm hinzufügen — läuft wie eine normale App, ohne Adressleiste.',
      },
    ],
  },

  en: {
    // Navigation
    nav_home:      'Overview',
    nav_calendar:  'Calendar',
    nav_analytics: 'Analytics',

    // Desktop
    home_subtitle:      'Contracts, subscriptions and running costs in one place',
    calendar_subtitle:  'When you get billed, and how much',
    analytics_subtitle: 'Where the money goes',
    today:              'Today',
    more_count:         (n) => `${n} more`,

    // Overview
    per_month:     'Per month',
    per_year:      'Per year',
    per_day:       'Per day',
    active_count:  (n) => `${n} active`,
    paused_count:  (n) => `${n} paused`,
    trial_count:   (n) => `${n} trial`,
    all_subs:      'All entries',
    search_placeholder: 'Search...',
    swipe_hint:    '← swipe to delete · swipe to edit →',
    sort_az:       'A–Z',
    sort_price:    'Amount',
    sort_date:     'Date',
    add_sub:       'Add entry',
    add_first_sub: 'Add first entry',
    empty_title:   'Nothing here yet',
    empty_subtitle:'A good moment to collect what goes out every month — energy, insurance, phone, subscriptions',
    nothing_found: (q) => `Nothing found for "${q}"`,

    // Toast
    sub_deleted:   'Entry deleted',
    sub_delete:    'Delete',
    sub_per_month: 'mo',
    sub_per_year:  'yr',
    undo:          'Undo',
    delete_confirm_hint: 'Documents and credentials are deleted with it.',

    // Calendar
    calendar_title: 'Calendar',
    expected:      (month) => `Expected in ${month}`,
    spent:         (month) => `Spent in ${month}`,
    soon:          'Upcoming',
    soon_empty:    'No payments in the next 7 days',
    not_billing:   'not billing',

    // Cancellation deadlines
    deadlines_title:   'Cancellation deadlines',
    deadlines_empty:   'No deadline in the next 90 days',
    deadline_until:    'Cancel by',
    deadline_days:     (n) => `${n} days left`,
    deadline_today:    'today',
    deadline_tomorrow: 'tomorrow',
    deadline_passed:   'deadline passed',

    // Import / Export
    io_title:          'Data',
    io_subtitle:       'Stored only on this device',
    io_export:         'Export',
    io_import:         'Import',
    io_import_hint:    'CSV or JSON',
    io_import_btn:     'Choose file',
    io_import_ok:      (n) => `Imported: ${n}`,
    io_import_err:     'Invalid file format',
    io_docs_note:      'Documents are not included in the export',

    // Analytics
    analytics_title:    'Analytics',
    by_categories:      'By category',
    by_subscriptions:   'By entry',
    trial_period:       'Trial period',
    on_pause:           'Paused',
    trend_title:        'Spending trend',
    trend_unit:         'm',
    trend_last:         (n) => `Last ${n} months`,

    // Modal
    modal_edit:         'Edit',
    modal_new:          'New entry',
    modal_name_placeholder: 'Name (e.g. Electricity)',
    modal_provider_placeholder: 'Provider (e.g. E.ON)',
    modal_price_placeholder: 'Amount',
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
    modal_month_placeholder: 'Month',
    modal_save:         'Save',
    modal_add:          'Add',
    modal_cancel:       'Cancel',
    modal_notes:        'Notes',
    modal_notes_placeholder: 'Anything else worth remembering...',

    // Modal tabs
    tab_basics: 'Basics',
    tab_details:'Details',
    tab_access: 'Access',
    tab_docs:   'Documents',

    // Contract data
    contract_section:  'Contract term',
    contract_start:    'Start date',
    contract_end:      'End date',
    notice_period:     'Notice period',
    notice_none:       'none',
    notice_months:     (n) => `${n} mo.`,
    auto_renew:        'Renews automatically',
    cancel_by_hint:    (date) => `Cancel by ${date}`,
    details_template:  'Contract details',
    details_common:    'Billing & contact',
    details_empty:     'Pick a category to see matching fields',

    // Custom fields
    custom_fields:  'Custom fields',
    custom_add:     'Add field',
    custom_label:   'Label',
    custom_value:   'Value',
    custom_remove:  'Remove field',
    type_text:      'Text',
    type_number:    'Number',
    type_date:      'Date',
    type_money:     'Amount',
    type_url:       'Link',
    type_secret:    'Secret',
    type_textarea:  'Multiline',

    // Access
    access_url:       'Portal / website',
    access_username:  'Username / email',
    access_password:  'Password',
    access_note:      'Note (e.g. 2FA, security question)',
    access_open:      'Open',
    access_copy:      'Copy',
    access_show:      'Show',
    access_hide:      'Hide',

    // Vault
    vault_title:        'Password vault',
    vault_intro:        'Passwords are encrypted with AES-GCM. The key is derived from your master password and never stored.',
    vault_warning:      'If you forget the master password, saved credentials are lost for good.',
    vault_passphrase:   'Master password',
    vault_repeat:       'Repeat master password',
    vault_create:       'Create vault',
    vault_unlock:       'Unlock',
    vault_lock:         'Lock',
    vault_locked:       'Vault locked',
    vault_locked_hint:  'Unlock to view and save passwords.',
    vault_wrong:        'Wrong master password',
    vault_mismatch:     'Entries do not match',
    vault_too_short:    'At least 8 characters',
    vault_unavailable:  'Encryption unavailable — the page must be served over HTTPS.',
    vault_reset:        'Reset vault',
    vault_reset_hint:   'Deletes all saved passwords and sets a new master password.',
    vault_reset_confirm:'Delete all saved passwords?',
    vault_decrypt_err:  'Could not decrypt the password',

    // Documents
    docs_add:       'Add file',
    docs_empty:     'No documents yet',
    docs_hint:      'Policy, contract, invoice — stays on this device',
    docs_open:      'Open',
    docs_download:  'Download',
    docs_delete:    'Delete',
    docs_too_large: (mb) => `File too large (max. ${mb} MB)`,
    docs_error:     'Could not save the file',
    docs_unavailable: 'File storage unavailable in this browser',
    docs_count:     (n) => `${n} document${n === 1 ? '' : 's'}`,

    // Categories
    cat_insurance:     'Insurance',
    cat_health:        'Health',
    cat_energy:        'Energy',
    cat_water:         'Water & waste',
    cat_housing:       'Housing',
    cat_internet:      'Internet',
    cat_mobile:        'Mobile',
    cat_transport:     'Transport',
    cat_broadcast:     'Broadcast fee',
    cat_banking:       'Banking',
    cat_fitness:       'Fitness',
    cat_membership:    'Membership',
    cat_entertainment: 'Entertainment',
    cat_work:          'Work & software',
    cat_ai:            'AI',
    cat_games:         'Games',
    cat_education:     'Education',
    cat_vpn:           'VPN',
    cat_other:         'Other',

    // Dates
    months_full:  ['January','February','March','April','May','June','July','August','September','October','November','December'],
    months_short: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    months_genitive: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    days_short:   ['Mo','Tu','We','Th','Fr','Sa','Su'],
    datepicker_choose: 'Choose date',

    // Cancellation helper
    cancel_how:  'How to cancel ',
    cancel_link: 'this contract',

    // Support
    support_title:    'Support the developer',
    support_subtitle: 'The app is free and always will be',
    support_open:     'Open →',
    support_copy:     'Copy address',
    support_copied:   '✓ Copied',

    // Status badges
    badge_paused: 'paused',
    badge_trial:  'trial',

    // Onboarding
    onb_skip: 'Skip',
    onb_next: 'Next',
    onb_manage_desktop: 'Hover an entry to reveal edit and delete. Clicking the row opens it right away.',
    pwa_ios_share: 'Tap "Share"',
    pwa_ios_share_hint: 'Button at the bottom of Safari',
    pwa_ios_add: '"Add to Home Screen"',
    pwa_ios_add_hint: 'Scroll down in the menu',
    pwa_android_menu: 'Browser menu',
    pwa_android_menu_hint: 'Three dots in top right',
    pwa_android_install: '"Install app"',
    pwa_android_install_hint: 'Or "Add to Home screen"',
    pwa_desktop_install: `"Install ${APP_NAME}"`,
    pwa_desktop_install_hint: 'Install icon in the address bar',
    onb_slides: [
      {
        title: 'Welcome!',
        subtitle: `${APP_NAME} keeps contracts, subscriptions and running costs in one place — insurance, energy, internet, phone and everything else that leaves your account each month.`,
      },
      {
        title: 'Add your contracts',
        subtitle: 'Type a name — the app suggests known providers and sets the category, then offers the fields that fit: policy number, meter number, last year\'s consumption.',
      },
      {
        title: 'Manage entries',
        subtitle: 'Swipe left to delete, swipe right to edit.',
      },
      {
        title: 'Never miss a deadline',
        subtitle: 'Add the contract end date and notice period — the app works out your cancel-by date and reminds you in time.',
      },
      {
        title: 'Documents & logins',
        subtitle: 'Attach policies and invoices as files, keep portal logins in the encrypted vault. Everything stays on this device.',
      },
      {
        title: 'Install the app',
        subtitle: 'Add it to your home screen — works like a native app, no browser address bar.',
      },
    ],
  },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
import { createContext, useContext } from 'react';

export const LangContext = createContext('de');

export const useLang = () => useContext(LangContext);

export const useT = () => {
  const lang = useLang();
  return translations[lang] || translations.de;
};
