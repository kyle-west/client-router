# ClientRouter

`ClientRouter` is an ExpressJS like client side router. It grabs a hold on the 
url when the user uses a link to navigate. This is intended to help progressive 
web apps manage the frontend independant of a server call. It uses the browser's
`history` API to control the pushing and poping of the page state.

It is also a work in progress. Stay tuned for better docs.

## Setup and usage

`ClientRouter` is an es6 class. Import it like you would any other module. After 
setting up your routes (See [below](#route-matching)), register the router on the
window. 

```js
import { ClientRouter } from '../client-router.js';
const router = new ClientRouter();

... // add route handling in here

router.registerOn(window);    
```

### Options

```js
let options = {
  routerId: 'my-cool-client-router', // unique identifier between apps
  debug: true                        // show additional logging info
}

const router = new ClientRouter(options);
```

## `ClientRoute.use()`

The `.use()` method allows us to apply matchers or behaviors to the routing. 

### Route matching

Route matching follows a similar pattern as Express. You can match literal routes
or a tokenized route that populates the `Context` with parameters.

```js
// render a page on a literal path matching
router.use('/about', renderYourAboutPageCB);
```

```js
router.use('/:section/:subSection', (context) => {
  
  // prefixing a path section with ':' will name that section in `context.params` 
  let section = context.params.section;
  let subSection = context.params.subSection;

  // now you can use the grepped data to apply on your app.
  renderYourPageCB(section, subSection);

});
```

You can append a parameter declaration with `(` `)` to specify a regex pattern
to enforce a match.

```js
router.use('/:section(home|about)/:subSection', (context) => {

  // now, the path will only ever match if the `section` is 'home' or 'about'
  let section = context.params.section;
  
  ...
});
```

Additionally, you may apply an array of matchers to a given handler.

```js
let matchingRoutes = ['/home/:subSection', '/about/:subSection'];

router.use(matchingRoutes, (context) => {
  // your code here
});
```

#### Optional Subpaths

Additional syntax of matchers includes `*` and `?` postfixes to sections.

The `*` postfix (e.g. `/your/route*`) will match any incoming route that is 
prefixed with the text before the `*` character.

The `?` postfix (e.g. `/your/:route?`) allows that section of the route to be 
optional. Unlike [Derived Subpaths](#derived-subpaths), these section values are
evaluated in the final callback of the middleware pipeline. 


### Derived Subpaths

A `DerivedSubpath` allows for a route to specify default values derived from a 
given callback. The callback for the DerivedSubpath can return an `async` object 
or a `String`. This is especially useful for forwarding to fully qualified paths 
in your app. 

Here is an example:

```js
let defaultSection = new DerivedSubpath('section', (context) => {
  return 'main'; // or whatever you need to do to compute the default `section`
})
router.use(defaultSection);

...

router.use('/page/$:section(main|about|contact)', renderPageSectionCB)
```

By this pinciple, the following are equivilant:

```js
router.use('/page', (context) => {
  router.redirect(`/page/main`);
})
router.use('/page/:section(main|about|contact)', (context) => {
  router.redirect(`/page/${context.params.section}/default`);
});
router.use('/page/:section(main|about|contact)/:subsection', renderPageCB);
```

and 

```js
router.use(new DerivedSubpath('section',    _ => 'main'));
router.use(new DerivedSubpath('subsection', _ => 'default'));
router.use('/page/$:section(main|about|contact)/$:subsection', renderPageCB);
```

The later being easier to read and understand by the developer than the former.

### Middleware

Middleware is a pipeline of functions that get applied when a matching route is 
rendered. A middleware function takes two parameters, `context`, and `next`. The `next`
argument is a function that envokes the next middleware in the pipeline. Naturally, 
 `next()` should not be called in the last function of the pipeline.

```js
let loggingMiddleware = (context, next) => {
  console.log('[ClientRouter]: navigating to ', context.path)
  next(); 
}

...

router.use('/:view', loggingMiddleware, renderYourAboutPageCB);
```

### `RouteHandler`

If you wish to make a particular handler reusable, you may form it as a `RouteHandler` for your convenience.

The constructor of `RouteHandler` takes two arguments: 
- [Matchers](#route-matching)
- And array of [middleware handlers](#middleware)

```js
let handler = new RouteHandler('/demo', [middleware1, middleware2, (context) => {
  // your handle here
}]);

router.use(handler);
```