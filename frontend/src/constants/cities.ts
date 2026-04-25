import type { City } from '../types';

// Slugs must match OLX.ua URL structure exactly: https://www.olx.ua/uk/{slug}/
export const CITIES: City[] = [
  { name: 'Запоріжжя',   slug: 'zaporozhe' },
  { name: 'Вся Україна', slug: '' },
  { name: 'Київ',        slug: 'kiev' },
  { name: 'Харків',      slug: 'kharkov' },
  { name: 'Одеса',       slug: 'odessa' },
  { name: 'Дніпро',      slug: 'dnepropetrovsk' },
  { name: 'Львів',       slug: 'lvov' },
  { name: 'Вінниця',     slug: 'vinnitsa' },
  { name: 'Миколаїв',    slug: 'nikolaev' },
  { name: 'Полтава',     slug: 'poltava' },
  { name: 'Херсон',      slug: 'kherson' },
  { name: 'Черкаси',     slug: 'cherkassy' },
];

export const DEFAULT_CITY = CITIES[0];
