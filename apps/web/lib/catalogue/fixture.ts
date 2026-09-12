import type {Storefront, WhiteColor, WhiteProduct, WhiteSet, StorefrontSection} from './types';

// Три модели и один образ — ровно столько, чтобы пройти по всем развилкам
// витрины: обычная вещь, вещь с разной ценой по цветам («от 2 250») и
// предзаказ без цены вообще. Данные срисованы с настоящего каталога (ключи,
// слаги, артикулы WB и пути к реально лежащим в public картинкам), поэтому
// страница на фикстуре выглядит как страница на базе.
//
// Живёт в коде, а не в JSON: e2e и локальная разработка поднимают витрину без
// API (CATALOGUE_SOURCE=fixture), и компилятор тогда ловит расхождение с
// контрактом сразу, а не на рендере.

const COAT_COLOURS: WhiteColor[] = [
  // Фикстура перевешивает ярлык: wb-795522033 в каталоге — слоновая кость, и
  // снимок модели тоже её. Здесь вариант назван чёрным, потому что образ носит
  // чёрное пальто; за подпись цвета фотографию не принимать.
  {id: 'wb-795522033', key: 'black', hex: '#2b2722', en: 'Black', ru: 'Чёрный', nm: 795522033},
  {
    id: 'wb-795528752',
    key: 'grey',
    hex: '#9a958d',
    en: 'Grey',
    ru: 'Серый',
    nm: 795528752,
    image: '/images/white/products/p-795522033-grey-Q.jpg',
    gallery: ['/images/white/products/p-795522033-grey-b-Q.jpg', '/images/white/products/p-795522033-grey-d-T.jpg'],
  },
  {
    id: 'wb-795327858',
    key: 'brown',
    hex: '#5c4433',
    en: 'Brown',
    ru: 'Коричневый',
    nm: 795327858,
    image: '/images/white/products/p-795522033-brown-Q.jpg',
    gallery: ['/images/white/products/p-795522033-brown-b-Q.jpg', '/images/white/products/p-795522033-brown-d-T.jpg'],
  },
];

// Порядок цветов выбран нарочно: образ носит слоновую кость, и она здесь
// вторая — иначе проверка setColour прошла бы и для функции, которая всегда
// возвращает первый цвет. Красный вдвое дешевле: на нём проверяется «от 2 250».
const SKIRT_COLOURS: WhiteColor[] = [
  {
    id: 'wb-379321819',
    key: 'red',
    hex: '#a02a24',
    en: 'Red',
    ru: 'Красный',
    nm: 379321819,
    price: 2250,
    image: '/images/white/products/p-371980450-red-V.jpg',
    gallery: ['/images/white/products/p-371980450-red-b-Z.jpg', '/images/white/products/p-371980450-red-d-Y.jpg'],
  },
  {id: 'wb-371980450', key: 'ivory', hex: '#ece6da', en: 'Ivory', ru: 'Слоновая кость', nm: 371980450, price: 5000},
];

const TRACKSUIT_COLOURS: WhiteColor[] = [
  {id: 'wb-1287075011', key: 'black', hex: '#2b2722', en: 'Black', ru: 'Чёрный', nm: 1287075011},
];

const PRODUCTS: WhiteProduct[] = [
  {
    id: '4b63e888-bc6b-5fed-b6a8-23237918c205',
    key: 2,
    slug: 'palto-pidzhak-pritalennoe',
    en: 'Fitted Blazer Coat',
    ru: 'Пальто-пиджак приталенное',
    cat: 'outerwear',
    price: 23000,
    descEn: 'A demi-season coat cut like a blazer — clean collarless shoulders and a sculpted, buttoned waist. Fully lined.',
    descRu: 'Демисезонное пальто с кроем пиджака — чистые плечи без воротника и скульптурная талия на пуговицах. На подкладе.',
    storyEn: 'A demi-season coat built on blazer logic: a clean shoulder, no collar, an open neckline. The waist is drawn in and buttoned, so the silhouette sculpts rather than falls straight.',
    storyRu: 'Демисезонное пальто, скроенное по логике пиджака: плечо чистое, без воротника, линия горловины открытая. Талия собрана и застёгнута на пуговицы — силуэт получается скульптурный, а не прямой.',
    compositionEn: 'Wool 60%, cashmere 20%, polyester 15%, viscose 5%',
    compositionRu: 'Шерсть 60%, кашемир 20%, полиэстер 15%, вискоза 5%',
    careEn: 'Dry clean only',
    careRu: 'Только химчистка',
    colors: COAT_COLOURS,
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    image: '/images/white/products/p-795522033-Q.jpg',
    gallery: ['/images/white/products/p-795522033-b-Q.jpg', '/images/white/products/p-795522033-d-Q.jpg'],
    nm: 795522033,
    featuredOrder: 0,
    lookbookOrder: 0,
  },
  {
    id: 'bd5db5fd-3c6b-5a71-97f5-dfeb054c524d',
    key: 8,
    slug: 'yubka-ballon-atlasnaya',
    en: 'Satin Balloon Skirt',
    ru: 'Юбка баллон атласная',
    cat: 'skirts',
    // Цена и артикул модели — с первого варианта, как их складывает API.
    price: 2250,
    descEn: 'A satin balloon mini with built-in shorts and a rounded volume. Matte sheen, holds its volume.',
    descRu: 'Атласная юбка-баллон мини с шортами и округлым объёмом. Матовый блеск, форма держит объём.',
    storyEn: 'The hem is gathered inward, so the skirt holds its shape without a petticoat, and shorts are built in — sit down, walk into the wind, stop thinking about the length.',
    storyRu: 'Подол собран внутрь, и юбка держит форму сама, без подъюбника. Внутри вшиты шорты — можно садиться, идти по ветру и не думать о длине.',
    compositionEn: 'Satin, polyester',
    compositionRu: 'Атлас, полиэстер',
    careEn: 'Machine wash cold',
    careRu: 'Машинная стирка в холодной воде',
    colors: SKIRT_COLOURS,
    // Неполный размерный ряд — часть отшита и разобрана; витрина обязана
    // предлагать только то, что склад отгрузит.
    sizes: ['XS', 'S', 'M'],
    image: '/images/white/products/p-371980450-V.jpg',
    gallery: ['/images/white/products/p-371980450-b-V.jpg', '/images/white/products/p-371980450-d-Y.jpg'],
    nm: 379321819,
  },
  // Цены нет нигде: карточка WB — заготовка, продажи ещё не открыты. Витрина на
  // такой вещи пишет «Предзаказ» и не отправляет покупателя на маркетплейс.
  {
    id: '1aeb77e0-9d2b-5b64-b773-c7da416ed0db',
    key: 21,
    slug: 'sportivnyy-kostyum-s-kantom',
    en: 'Piped Tracksuit',
    ru: 'Спортивный костюм с кантом',
    cat: 'tailoring',
    descEn: 'A matching fleece two-piece — a high funnel neck and contrast piping tracing the raglan and the leg. Sold as a set only.',
    descRu: 'Костюм-двойка из футера — высокий ворот-стойка и контрастный кант по реглану и ноге. Продаётся только комплектом.',
    compositionEn: 'Cotton-rich fleece',
    compositionRu: 'Хлопковый футер с начёсом',
    careEn: 'Machine wash cold, gentle',
    careRu: 'Деликатная стирка в холодной воде',
    colors: TRACKSUIT_COLOURS,
    image: '/images/white/products/p-1287075011-OA.jpg',
    nm: 1287075011,
    season: 'aw26',
  },
];

const SETS: WhiteSet[] = [
  {
    key: 'everyday',
    en: 'Everyday Ease',
    ru: 'На каждый день',
    descEn: 'The fitted blazer coat over the satin balloon skirt.',
    descRu: 'Приталенное пальто-пиджак поверх атласной юбки-баллона.',
    image: '/images/white/sets/everyday-v11.jpg',
    items: [
      {productId: 'wb-795522033', productKey: 2, colourKey: 'black'},
      {productId: 'wb-371980450', productKey: 8, colourKey: 'ivory'},
    ],
  },
];

const SECTIONS: StorefrontSection[] = [
  {
    id: '9c2f9e2a-6b8b-5f9e-8a2b-7c6e9f6a2b41',
    slug: 'home-ticker',
    layout: 'ticker',
    status: 'active',
    nameRu: 'Бегущая строка',
    nameEn: 'Home ticker',
    sortOrder: -1,
    // Пусто — ровно то, что стоит на витрине сразу после выкатки V33, пока
    // владелец не впишет первую строку. Наполненная версия — только в
    // STOREFRONT_DRAFT_FIXTURE ниже: другого способа выдать e2e-спеке оба
    // состояния («полосы нет» и «полоса видна») без второго фикстур-модуля нет.
    items: [],
  },
  {
    id: 'f312be81-f743-5e5f-bd71-08d225bafbca',
    slug: 'aw26-hero',
    layout: 'hero',
    status: 'active',
    nameRu: 'Осень / Зима 2026',
    nameEn: 'Autumn / Winter 2026',
    eyebrowRu: 'Осень / Зима 2026',
    eyebrowEn: 'Autumn / Winter 2026',
    headlineRu: 'Точный\nкрой',
    headlineEn: 'Precise\ntailoring',
    videoUrl: '/videos/white/hero-mark2.mp4',
    videoDesktopUrl: '/videos/white/hero-desktop.mp4',
    posterUrl: '/images/white/hero-mark2.jpg',
    posterDesktopUrl: '/images/white/hero-desktop.jpg',
    sortOrder: 0,
  },
  {
    id: '254b4e10-1cc1-5efb-84d0-213429810a3a',
    slug: 'sets-teaser',
    layout: 'sets-teaser',
    status: 'active',
    nameRu: 'Сеты',
    nameEn: 'Sets',
    eyebrowRu: 'Сеты',
    eyebrowEn: 'Sets',
    headlineRu: 'Готовые сочетания,\nбез долгих сборов',
    headlineEn: 'Ready combinations,\nno deciding required',
    bodyRu: 'Сеты из вещей коллекции — в офис, на вечер, на каждый день. Целиком или по отдельности.',
    bodyEn: 'Sets built from the collection — for the office, the evening, the everyday. Together or piece by piece.',
    videoUrl: '/videos/white/sets-static.mp4',
    posterUrl: '/images/white/sets-static.jpg',
    sortOrder: 1,
  },
];

export const STOREFRONT_FIXTURE: Storefront = {products: PRODUCTS, sets: SETS, sections: SECTIONS};

// Та же витрина, какой её видит владелец в режиме редактирования: поверх
// опубликованного лежит черновик героя и черновик цены одного варианта, а у
// одной карточки черновик НЕ ЧИТАЕТСЯ — она отдана опубликованной и помечена.
// Нужна там же, где и STOREFRONT_FIXTURE: e2e и локальная разработка без API.
// Отличия от опубликованного видны глазом — иначе спека «без флага черновика
// нет» проходила бы на одинаковых данных и ничего не доказывала.
export const STOREFRONT_DRAFT_FIXTURE: Storefront = {
  products: PRODUCTS.map((p) =>
    p.key === 2
      ? {...p, colors: p.colors.map((c, i) => (i === 0 ? {...c, price: 19900, sale: 17900} : c))}
      : p,
  ),
  sets: SETS,
  sections: SECTIONS.map((s) => {
    if (s.layout === 'hero') return {...s, eyebrowRu: 'Черновик · Осень / Зима 2026', headlineRu: 'Черновик\nзаголовка'};
    // Черновик ticker: пусто у STOREFRONT_FIXTURE — здесь ровно то, что владелец
    // увидит, набрав первые строки. Одна без даты (всегда видна), одна с датой
    // в далёком будущем (проверка поля «до», не протухнет сама по себе), одна
    // без en (не должна показаться на английской странице).
    if (s.layout === 'ticker') {
      return {
        ...s,
        items: [
          {ru: 'Открытие шоурума на Патриарших', en: 'Showroom opening on Patriarshiye', href: '/ru/lookbook'},
          {ru: 'Скидка 20% до конца сезона', en: '20% off through the end of the season', until: '2099-01-01'},
          {ru: 'Новая примерка по записи'},
        ],
      };
    }
    return s;
  }),
  brokenDrafts: [
    {
      kind: 'set',
      id: '8f2a1f2c-2f7a-5c2e-9c47-0f1f1f8d7a10',
      key: SETS[0]!.key,
      reason: 'duplicate_set_item:wb-795522033',
    },
  ],
};
