// routerService.js
let routerInstance = null;

export const setRouter = (router) => {
  routerInstance = router;
};

export const getRouter = () => routerInstance;
