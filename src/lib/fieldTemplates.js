// ─── Feldvorlagen je Kategorie ────────────────────────────────────────────────
// Jede Kategorie bringt die Felder mit, die für deutsche Verträge relevant sind.
// Labels stehen hier direkt (de/en) statt in i18n.js — sie gehören zum Feld.
//
// type: text | textarea | number | date | money | tel | url | select | secret

const t = (de, en) => ({ de, en });

export const label = (field, lang) => field.label[lang] || field.label.en;

export const optionLabel = (option, lang) => option[lang] || option.en;

// Felder, die für jeden Vertrag sinnvoll sind
export const COMMON_FIELDS = [
  { id: 'contract_holder',   label: t('Vertragsinhaber', 'Contract holder'),    type: 'text' },
  { id: 'customer_number',   label: t('Kundennummer', 'Customer number'),        type: 'text' },
  { id: 'contract_number',   label: t('Vertragsnummer', 'Contract number'),      type: 'text' },
  { id: 'payment_method',    label: t('Zahlungsweise', 'Payment method'),        type: 'select', options: [
    { value: 'sepa',     ...t('SEPA-Lastschrift', 'SEPA direct debit') },
    { value: 'transfer', ...t('Überweisung', 'Bank transfer') },
    { value: 'card',     ...t('Kreditkarte', 'Credit card') },
    { value: 'paypal',   ...t('PayPal', 'PayPal') },
    { value: 'cash',     ...t('Bar', 'Cash') },
  ] },
  { id: 'payment_reference', label: t('Verwendungszweck', 'Payment reference'),  type: 'text' },
  { id: 'hotline',           label: t('Service-Hotline', 'Service hotline'),     type: 'tel' },
];

export const TEMPLATES = {
  insurance: [
    { id: 'insurance_type', label: t('Versicherungsart', 'Type of insurance'), type: 'select', options: [
      { value: 'haftpflicht',   ...t('Privathaftpflicht', 'Personal liability') },
      { value: 'hausrat',       ...t('Hausrat', 'Home contents') },
      { value: 'wohngebaeude',  ...t('Wohngebäude', 'Buildings') },
      { value: 'kfz',           ...t('KFZ', 'Car') },
      { value: 'kranken_gkv',   ...t('Krankenversicherung (gesetzlich)', 'Health (statutory)') },
      { value: 'kranken_pkv',   ...t('Krankenversicherung (privat)', 'Health (private)') },
      { value: 'zahnzusatz',    ...t('Zahnzusatz', 'Dental supplement') },
      { value: 'rechtsschutz',  ...t('Rechtsschutz', 'Legal expenses') },
      { value: 'bu',            ...t('Berufsunfähigkeit', 'Occupational disability') },
      { value: 'leben',         ...t('Lebensversicherung', 'Life') },
      { value: 'unfall',        ...t('Unfallversicherung', 'Accident') },
      { value: 'reise',         ...t('Reiseversicherung', 'Travel') },
      { value: 'tier',          ...t('Tierversicherung', 'Pet') },
      { value: 'sonstige',      ...t('Sonstige', 'Other') },
    ] },
    { id: 'policy_number',      label: t('Versicherungsscheinnummer', 'Policy number'),   type: 'text' },
    { id: 'versichertennummer', label: t('Versichertennummer', 'Insured person number'),  type: 'text' },
    { id: 'insured_person',     label: t('Versicherte Person', 'Insured person'),         type: 'text' },
    { id: 'insured_object',     label: t('Versichertes Objekt', 'Insured object'),        type: 'text' },
    { id: 'coverage',           label: t('Deckungssumme', 'Coverage amount'),             type: 'money' },
    { id: 'deductible',         label: t('Selbstbeteiligung', 'Deductible'),              type: 'money' },
    { id: 'sf_klasse',          label: t('Schadenfreiheitsklasse', 'No-claims class'),    type: 'text' },
    { id: 'claim_hotline',      label: t('Schadenshotline', 'Claims hotline'),            type: 'tel' },
    { id: 'agent',              label: t('Vermittler / Ansprechpartner', 'Agent / contact'), type: 'text' },
    { id: 'agent_phone',        label: t('Telefon Vermittler', 'Agent phone'),            type: 'tel' },
  ],

  health: [
    { id: 'krankenkasse',              label: t('Krankenkasse', 'Health insurer'),                       type: 'text' },
    { id: 'versichertennummer',        label: t('Versichertennummer', 'Insurance number'),               type: 'text' },
    { id: 'sozialversicherungsnummer', label: t('Sozialversicherungsnummer', 'Social insurance number'), type: 'text' },
    { id: 'card_number',               label: t('Nummer der Gesundheitskarte', 'Health card number'),    type: 'text' },
    { id: 'insured_person',            label: t('Versicherte Person', 'Insured person'),                 type: 'text' },
    { id: 'insurance_status',          label: t('Status', 'Status'), type: 'select', options: [
      { value: 'pflicht',    ...t('Pflichtversichert', 'Compulsorily insured') },
      { value: 'freiwillig', ...t('Freiwillig versichert', 'Voluntarily insured') },
      { value: 'familie',    ...t('Familienversichert', 'Family insured') },
      { value: 'privat',     ...t('Privat versichert', 'Privately insured') },
    ] },
    { id: 'claim_hotline',             label: t('Service-Telefon', 'Support phone'),                     type: 'tel' },
  ],

  energy: [
    { id: 'energy_type', label: t('Energieart', 'Energy type'), type: 'select', options: [
      { value: 'strom',      ...t('Strom', 'Electricity') },
      { value: 'gas',        ...t('Gas', 'Gas') },
      { value: 'fernwaerme', ...t('Fernwärme', 'District heating') },
    ] },
    { id: 'zaehlernummer',          label: t('Zählernummer', 'Meter number'),                    type: 'text' },
    { id: 'malo_id',                label: t('Marktlokations-ID (MaLo)', 'Market location ID'),  type: 'text' },
    { id: 'supply_address',         label: t('Lieferadresse', 'Supply address'),                 type: 'textarea' },
    { id: 'tariff',                 label: t('Tarif', 'Tariff'),                                 type: 'text' },
    { id: 'consumption_last_year',  label: t('Jahresverbrauch Vorjahr', 'Consumption last year'), type: 'number', unit: 'kWh' },
    { id: 'meter_reading',          label: t('Zählerstand', 'Meter reading'),                    type: 'number', unit: 'kWh' },
    { id: 'meter_reading_date',     label: t('Datum Zählerstand', 'Meter reading date'),         type: 'date' },
    { id: 'working_price',          label: t('Arbeitspreis', 'Unit price'),                      type: 'number', unit: 'ct/kWh' },
    { id: 'base_price',             label: t('Grundpreis', 'Base price'),                        type: 'money', unit: '/ Monat' },
    { id: 'abschlag',               label: t('Monatlicher Abschlag', 'Monthly instalment'),      type: 'money' },
    { id: 'price_guarantee_until',  label: t('Preisgarantie bis', 'Price guarantee until'),      type: 'date' },
    { id: 'previous_provider',      label: t('Vorversorger', 'Previous provider'),               type: 'text' },
  ],

  water: [
    { id: 'zaehlernummer',         label: t('Zählernummer', 'Meter number'),                     type: 'text' },
    { id: 'supply_address',        label: t('Lieferadresse', 'Supply address'),                  type: 'textarea' },
    { id: 'consumption_last_year', label: t('Jahresverbrauch Vorjahr', 'Consumption last year'), type: 'number', unit: 'm³' },
    { id: 'meter_reading',         label: t('Zählerstand', 'Meter reading'),                     type: 'number', unit: 'm³' },
    { id: 'meter_reading_date',    label: t('Datum Zählerstand', 'Meter reading date'),          type: 'date' },
    { id: 'waste_bin',             label: t('Tonnengröße / Abfuhrrhythmus', 'Bin size / pickup'), type: 'text' },
  ],

  housing: [
    { id: 'address',          label: t('Adresse', 'Address'),                            type: 'textarea' },
    { id: 'landlord',         label: t('Vermieter / Hausverwaltung', 'Landlord / property manager'), type: 'text' },
    { id: 'landlord_contact', label: t('Kontakt Vermieter', 'Landlord contact'),          type: 'tel' },
    { id: 'kaltmiete',        label: t('Kaltmiete', 'Base rent'),                        type: 'money' },
    { id: 'nebenkosten',      label: t('Nebenkosten', 'Service charges'),                type: 'money' },
    { id: 'deposit',          label: t('Kaution', 'Deposit'),                            type: 'money' },
    { id: 'size',             label: t('Wohnfläche', 'Living space'),                    type: 'number', unit: 'm²' },
    { id: 'rooms',            label: t('Zimmer', 'Rooms'),                               type: 'number' },
    { id: 'move_in',          label: t('Einzugsdatum', 'Move-in date'),                  type: 'date' },
  ],

  internet: [
    { id: 'connection_address', label: t('Anschlussadresse', 'Connection address'),   type: 'textarea' },
    { id: 'bandwidth',          label: t('Geschwindigkeit', 'Bandwidth'),             type: 'text', placeholder: '250 Mbit/s' },
    { id: 'line_id',            label: t('Anschlusskennung', 'Line ID'),              type: 'text' },
    { id: 'phone_number',       label: t('Festnetznummer', 'Landline number'),        type: 'tel' },
    { id: 'router',             label: t('Router / Hardware', 'Router / hardware'),   type: 'text' },
    { id: 'activation_date',    label: t('Schaltdatum', 'Activation date'),           type: 'date' },
  ],

  mobile: [
    { id: 'phone_number', label: t('Rufnummer', 'Phone number'),               type: 'tel' },
    { id: 'data_volume',  label: t('Datenvolumen', 'Data allowance'),          type: 'text', placeholder: '20 GB' },
    { id: 'network',      label: t('Netz', 'Network'),                         type: 'text', placeholder: 'Telekom / Vodafone / O₂' },
    { id: 'sim_number',   label: t('SIM-Kartennummer (ICCID)', 'SIM number (ICCID)'), type: 'text' },
    { id: 'sim_pin',      label: t('SIM-PIN', 'SIM PIN'),                      type: 'secret' },
    { id: 'puk',          label: t('PUK', 'PUK'),                              type: 'secret' },
    { id: 'device',       label: t('Gerät', 'Device'),                         type: 'text' },
  ],

  transport: [
    { id: 'vehicle',       label: t('Fahrzeug', 'Vehicle'),                        type: 'text' },
    { id: 'license_plate', label: t('Kennzeichen', 'Licence plate'),               type: 'text' },
    { id: 'vin',           label: t('Fahrgestellnummer (FIN)', 'VIN'),             type: 'text' },
    { id: 'hu_due',        label: t('HU / TÜV bis', 'Inspection due'),             type: 'date' },
    { id: 'ticket_number', label: t('Ticket- / Abonummer', 'Ticket / pass number'), type: 'text' },
  ],

  broadcast: [
    { id: 'beitragsnummer', label: t('Beitragsnummer', 'Contribution number'), type: 'text' },
    { id: 'address',        label: t('Wohnung / Adresse', 'Flat / address'),   type: 'textarea' },
  ],

  banking: [
    { id: 'bank',              label: t('Bank', 'Bank'),                          type: 'text' },
    { id: 'iban',              label: t('IBAN', 'IBAN'),                          type: 'text' },
    { id: 'bic',               label: t('BIC', 'BIC'),                            type: 'text' },
    { id: 'account_type',      label: t('Kontoart', 'Account type'),              type: 'text', placeholder: 'Girokonto / Depot' },
    { id: 'card_last4',        label: t('Karte (letzte 4)', 'Card (last 4)'),     type: 'text' },
    { id: 'online_banking_id', label: t('Online-Banking-ID', 'Online banking ID'), type: 'text' },
  ],

  fitness: [
    { id: 'member_number', label: t('Mitgliedsnummer', 'Member number'), type: 'text' },
    { id: 'studio',        label: t('Studio / Standort', 'Gym / location'), type: 'text' },
  ],

  membership: [
    { id: 'member_number', label: t('Mitgliedsnummer', 'Member number'), type: 'text' },
    { id: 'member_since',  label: t('Mitglied seit', 'Member since'),    type: 'date' },
  ],

  education: [
    { id: 'account_email', label: t('Konto-E-Mail', 'Account email'), type: 'text' },
    { id: 'course',        label: t('Kurs / Programm', 'Course / programme'), type: 'text' },
  ],
};

// Kategorien ohne eigene Vorlage bekommen diese Felder
const DEFAULT_TEMPLATE = [
  { id: 'plan',          label: t('Tarif / Plan', 'Plan'),          type: 'text' },
  { id: 'account_email', label: t('Konto-E-Mail', 'Account email'), type: 'text' },
];

export const templateFor = (category) => TEMPLATES[category] || DEFAULT_TEMPLATE;

export const fieldsFor = (category) => [...templateFor(category), ...COMMON_FIELDS];

// Findet eine Felddefinition über alle Vorlagen hinweg — für die Anzeige
// gespeicherter Werte, deren Kategorie inzwischen gewechselt wurde.
export const findFieldDef = (id) => {
  for (const list of [...Object.values(TEMPLATES), DEFAULT_TEMPLATE, COMMON_FIELDS]) {
    const found = list.find((field) => field.id === id);
    if (found) return found;
  }
  return null;
};

export const CUSTOM_FIELD_TYPES = ['text', 'number', 'date', 'money', 'url', 'secret', 'textarea'];
