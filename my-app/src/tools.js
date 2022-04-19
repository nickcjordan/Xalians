import elements from './json/elements.json';

export function getJson(fileName) {
    if (fileName == 'elements') {
        return JSON.stringify(elements);
    }
}