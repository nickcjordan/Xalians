import elements from '@xalians/content/elements.json';

export function getJson(fileName) {
    if (fileName == 'elements') {
        return JSON.stringify(elements);
    }
}