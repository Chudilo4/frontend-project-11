import axios from 'axios';
import {
  rssParser, generatorId, addFidId, singlePostRender, showButtonFunction,
} from './rssParser.js';
import ruLocaleKeys from './locales/ru.js';

const addPostInfoInStateForUpdateFnc = (watchedState, postTitle, post, url, postDescription) => {
  watchedState.posts.push({
    title: postTitle,
    link: post.querySelector('link').textContent,
    dependsOnTheURL: url,
    postId: generatorId(),
    fidId: '',
    isReaded: false,
    goal: postDescription,
  });
};

const updatePosts = (watchedState) => {
  const existingURL = Object.keys(watchedState.existingURL);
  existingURL.forEach((url) => axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(`${url}`)}`)
    .then((response) => {
      if (response.status !== 200) {
        watchedState.getRssStatus = 'failed';// eslint-disable-line no-param-reassign
        watchedState.rssId = '01NP';// eslint-disable-line no-param-reassign
        throw new Error(ruLocaleKeys.statusText.rssFailedId['01NP']);
      }
      return response;
    })
    .then((data) => {
      watchedState.updateRssStatus = 'Success';// eslint-disable-line no-param-reassign
      const dataText = data.data.contents;
      const xml = rssParser(dataText);
      const postLists = xml.querySelectorAll('item');
      postLists.forEach((post) => {
        const postTitle = post.querySelector('title').textContent;
        const postDescription = post.querySelector('description').textContent;
        const postExists = watchedState.posts.some((existsPost) => existsPost.title === postTitle);
        if (!postExists) {
          addPostInfoInStateForUpdateFnc(watchedState, postTitle, post, url, postDescription);
          addFidId(watchedState);
          singlePostRender(post);
          const buttons = document.querySelectorAll('.btn.btn-outline-primary.btn-sm');
          buttons.forEach((button) => {
            button.addEventListener(('click'), () => {
              showButtonFunction(watchedState, button);
            });
          });
        }
      });
      console.log('watchedState', watchedState);
    })
    .catch((error) => {
      console.log(error);
      watchedState.updateRssStatus = ruLocaleKeys.statusText.newWorkProblems['01NP'];// eslint-disable-line no-param-reassign
    })
    .finally(() => setTimeout(() => updatePosts(watchedState), 5000)));
};

export default updatePosts;
