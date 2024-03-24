/* eslint-disable no-param-reassign */

import onChange from 'on-change';
import * as yup from 'yup';
import axios from 'axios';
import ruLocaleKeys from './locales/ru.js';
import { rssParser, xmlRender } from './rssParser.js';
import updatePosts from './updatePosts.js';

// Description of Id statuses:
// for example 01VF - it means 01-number, VF- Validation Failed
// VS - validation success, RS- RSS Success, RF - RSS Failed

// Yup
yup.setLocale({
  string: {
    required: () => ({ key: 'ruLocaleKeys.statusText.validationFailedId[01VF]' }),
    url: () => ({ key: 'ruLocaleKeys.statusText.validationFailedId[02VF]' }),
    notOneOf: () => ({ key: 'ruLocaleKeys.statusText.validationFailedId[03VF]' }),
    rssSuccess: () => ({ key: 'ruLocaleKeys.statusText.rssSuccessId[01RS]' }),
    rssFailedNotValid: () => ({ key: 'ruLocaleKeys.statusText.rssFailedId[01RF]' }),
  },

});

// Validation
const validation = (watchedState, state) => {
  // yup
  const schema = yup.object().shape({
    formValue: yup.string()
      .required()
      .url()
      .trim()
      .notOneOf(Object.keys(state.existingURL)),
  });

  return schema.validate(state)
    .then(() => {
      // eslint-disable-next-line no-param-reassign
      watchedState.validationId = '01VS';
      // watchedState.validationError = '';
      watchedState.validationStatus = 'success';
    })
    .catch((error) => {
      console.log(error.type);
      if (error.type === 'url') {
        watchedState.validationId = '02VF';
      } else if (error.type === 'notOneOf') {
        watchedState.validationId = '03VF';
      }
      watchedState.validationStatus = 'failed';
      return Promise.reject(error);
    });
};

// Clean status,errors
const cleanRssAndValidationStatusAndText = (watchedState) => {
  watchedState.validationId = '';
  watchedState.rssId = '';
  watchedState.getRssStatus = '';
  watchedState.validationStatus = '';
  console.log('Очищенное состояние:', watchedState);
};

// Functions for render
const validationFailedUpdate = (elementInfo, elementInput, i18n, state) => {
  elementInfo.textContent = i18n.t(ruLocaleKeys.statusText.validationFailedId[state.validationId]);
  if (!elementInfo.classList.contains('text-danger')) {
    elementInfo.classList.add('text-danger');
  } if (!elementInput.classList.contains('is-invalid')) {
    elementInput.classList.add('is-invalid');
  }
};

const rssSuccessUpdate = (elementInfo, elementInput, i18n, state) => {
  if (elementInfo.classList.contains('text-danger')) {
    elementInfo.classList.remove('text-danger');
  } if (!elementInfo.classList.contains('text-success')) {
    elementInfo.classList.add('text-success');
  }
  elementInfo.textContent = i18n.t(ruLocaleKeys.statusText.rssSuccessId[state.rssId]);
  if (elementInput.classList.contains('is-invalid')) {
    elementInput.classList.remove('is-invalid');
  }
  elementInput.value = '';
  elementInput.focus();
};

const rssFailedUpdate = (elementInfo, elementInput, i18n, state) => {
  if (!elementInfo.classList.contains('text-danger')) {
    elementInfo.classList.add('text-danger');
  } if (elementInfo.classList.contains('text-success')) {
    elementInfo.classList.remove('text-success');
  }
  elementInfo.textContent = i18n.t(ruLocaleKeys.statusText.rssFailedId[state.rssId]);
  if (elementInput.classList.contains('is-invalid')) {
    elementInput.classList.remove('is-invalid');
  }
};

// render
const render = (state, elements, i18n) => {
  // Validation failed
  switch (state.validationStatus) {
    case 'failed':
      validationFailedUpdate(elements.infoPElement, elements.inputField, i18n, state);
      break;
      // Validation success
    case 'success':
      console.log('1 step render');
      // getRss success
      switch (state.getRssStatus) {
        case 'success':
          console.log('2 step render');
          rssSuccessUpdate(elements.infoPElement, elements.inputField, i18n, state);
          break;
        // getRss failed
        case 'failed':
          console.log('render Failed');
          rssFailedUpdate(elements.infoPElement, elements.inputField, i18n, state);
          break;
        default:
      }
      break;
    default:
  }
};

// Get Rss Info
const getRssInfo = (url, watchedState) => axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`)
  .catch(() => {
    watchedState.getRssStatus = 'failed';
    watchedState.rssId = '01NP';
    throw new Error(ruLocaleKeys.statusText.rssFailedId['01NP']);
  })
  .then((data) => {
    const dataText = data.data.contents;
    const xmlDoc = rssParser(dataText);
    console.log('XML Document', xmlDoc);
    const channelElement = xmlDoc.getElementsByTagName('channel')[0];
    if (channelElement) {
      // Успешный ответ с каналами
      watchedState.getRssStatus = 'success';
      watchedState.rssId = '01RS';
      watchedState.existingURL[url] = true;
      xmlRender(xmlDoc, watchedState);
    } else {
      // В ответе нет данных, считаем, что ресурс не существует
      watchedState.getRssStatus = 'failed';
      watchedState.rssId = '01RF';
      throw new Error(ruLocaleKeys.statusText.rssFailedId['01RF']);
    }
  });

// onChange + IinitilizationView
const initilizationView = (state, elements, i18n) => {
  const watchedState = onChange(state, (path, value) => {
    state[path] = value;
  });

  cleanRssAndValidationStatusAndText(watchedState);
  console.log('Initial state:', state);

  validation(watchedState, state, i18n)

    .then(() => getRssInfo(state.formValue, watchedState, i18n))
    .then(() => {
      console.log(state);
      console.log('state.existingURL', Object.keys(state.existingURL));
    })
    .catch((error) => {
      console.error('Error during initialization:', error);
      console.log(state);
    })
    .finally(() => {
      updatePosts(watchedState);
      render(state, elements, i18n);
    });
};

export default initilizationView;
