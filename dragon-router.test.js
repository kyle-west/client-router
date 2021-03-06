function wait (cb, time) {
  return new Promise ((resolve) => {
    setTimeout(() => {
      cb();
      resolve()
    }, time)
  })
}


['./dist/dragon-router', './dist/dragon-router.min'].forEach(distFile => {
  const {Router, Context, DerivedSubpath, RouteHandler, TokenizedPath} = require(distFile)
  const router = new Router({registerOn: window});
  
  const middleware1 = (ctx, next) => { ctx.params.middleware1 = true; next(); }
  const middleware2 = (ctx, next) => { ctx.params.middleware2 = true; next(); }
  const middleware3 = (ctx, next) => { ctx.params.middleware3 = true; next(); }
  
  test(`${distFile} :: We can get all the class definitions out of the package`, () => {
    [Router, Context, DerivedSubpath, RouteHandler, TokenizedPath].forEach(classDefinition => {
      expect(classDefinition).toBeDefined();
    });
  });
  
  test(`${distFile} :: We can define literal matchers`, () => {
    let calledTimes = 0;
    router.use('/user', (context) => {
      expect(context.path).toBe('/user');
      calledTimes += 1;
    })
  
    router.navigate('/user')
    expect(calledTimes).toBe(1)
  });
  
  test(`${distFile} :: We can define section parameters`, () => {
    let calledTimes = 0;
    router.use('/user/:section(info|settings)', (context) => {
      expect(['info', 'settings']).toContain(context.params.section);
      calledTimes += 1;
    })
  
    router.navigate('/user/info')
    router.navigate('/user/settings')
    expect(calledTimes).toBe(2)
  });
  
  test(`${distFile} :: We can define optional parameters`, () => {
    let calledTimes = 0;
    router.use('/about/:person?', (context) => {
      expect([undefined, 'sally', 'sam']).toContain(context.params.person);
      calledTimes += 1;
    })
  
    router.navigate('/about/')
    router.navigate('/about/sally')
    router.navigate('/about/sam')
    expect(calledTimes).toBe(3)
  });
  
  test(`${distFile} :: We can define star routes`, () => {
    let calledTimes = 0;
    router.use('/home*', (context) => {
      expect(context.path).toMatch(/^\/home.*$/);
      calledTimes += 1;
    })
  
    router.navigate('/home')
    router.navigate('/homer')
    router.navigate('/home/test')
    expect(calledTimes).toBe(3)
  });
  
  test(`${distFile} :: We can add middleware that can manipulate the Context`, () => {
    let calledTimes = 0;
    router.use('/test/middleware', middleware1, middleware2, middleware3, (context) => {
      expect(context.params).toMatchObject({
        middleware1 : true, middleware2 : true, middleware3 : true
      });
      calledTimes += 1;
    })
  
    router.navigate('/test/middleware')
    expect(calledTimes).toBe(1)
  });
  
  test(`${distFile} :: We can use route handlers`, () => {
    let calledTimes = 0;
    let handler = new RouteHandler('/test/route-handler', [middleware1, middleware2, middleware3, (context) => {
      expect(context.params).toMatchObject({
        middleware1 : true, middleware2 : true, middleware3 : true
      });
      calledTimes += 1;
    }]);
    router.use(handler)
  
    router.navigate('/test/route-handler')
    expect(calledTimes).toBe(1)
  });
  
  test(`${distFile} :: We can use derived subpaths`, async () => {
    let calledTimes = 0;
    router.use(new DerivedSubpath('fillThisPartIn', () => 'this-part-was-filled-in'))
    router.use('/test/$:fillThisPartIn(this-part-was-filled-in)/:rest(the-rest-of-the-path)', (context) => {
      expect(context.path).toBe('/test/this-part-was-filled-in/the-rest-of-the-path');
      calledTimes += 1;
    })
  
    router.navigate('/test/the-rest-of-the-path')
    router.navigate('/test/this-part-was-filled-in/the-rest-of-the-path')

    await wait(() => {
      expect(calledTimes).toBe(2)
    }, 50)
  });

  test(`${distFile} :: We can use RegExp`, () => {
    let calledTimes = 0;
    let matcher = new RegExp(/^\/this\/is\/a\/\w+\/matcher$/)
    router.use(matcher, (context) => {
      expect(context.path.startsWith('/this/is/a/')).toBe(true)
      expect(context.path.endsWith('/matcher')).toBe(true)
      calledTimes += 1;
    })

    router.navigate('/this/is/a/regex/matcher')
    router.navigate('/this/is/a/cool/matcher')
    router.navigate('/this/is/a/fancy/matcher')
    expect(calledTimes).toBe(3)
  });

  router.unregister()

  const router2 = new Router({ basePath: '/test/base-path', registerOn: window });

  test(`${distFile} :: We can use mount our app on a base path`, () => {
    let calledTimes = 0;

    router2.use('/', (context) => {
      switch (calledTimes) {
        case 0: expect(context.path).toBe('/test/base-path'); break;
        case 1: expect(context.path).toBe('/test/base-path/'); break;
      } 
      calledTimes += 1;
    })
    router2.use('/:test(test1|test2)/:subsection?', (context) => {
      switch (calledTimes) {
        case 2: expect(context.path).toBe('/test/base-path/test1'); break;
        case 3: expect(context.path).toBe('/test/base-path/test2/subsectionA'); break;
        case 4: expect(context.path).toBe('/test/base-path/test2/subsectionB'); break;
      } 
      calledTimes += 1;
    })
  
    router2.navigate('/test/base-path')
    router2.navigate('/test/base-path/')
    router2.navigate('/test/base-path/test1')
    router2.navigate('/test/base-path/test2/subsectionA')
    router2.navigate('/test/base-path/test2/subsectionB')
    expect(calledTimes).toBe(5)
  });

  router2.unregister()

  const router3 = new Router({registerOn: window, routerId: 'test'});

  test(`${distFile} :: We can use global middleware`, () => {
    let calledTimes = 0;
    router3.use(
      (ctx, next) => {
        expect(ctx.beenThroughGlobalMiddleware).toBe(undefined)
        calledTimes += 1;
        next()
      },
      (ctx, next) => {
        ctx.beenThroughGlobalMiddleware = true
        calledTimes += 1;
        next()
      },
      (ctx, next) => {
        expect(ctx.beenThroughGlobalMiddleware).toBe(true)
        calledTimes += 1;
        next()
      }
      )
      
      router3.use('/test/global/middleware', (ctx) => {
        expect(ctx.beenThroughGlobalMiddleware).toBe(true)
        calledTimes += 1;
      })
      
    router3.navigate('/test/global/middleware')
    expect(calledTimes).toBe(4)
  });

  router3.unregister()

  test(`${distFile} :: Router methods are chainable`, () => {
    let calledTimes = 0;
    
    new Router()
      .registerOn(window)
      .use('/test/chainable', (ctx) => {
        calledTimes += 1;
        expect(ctx.globalMiddlewareFired).toBe(true)
      })
      .use((ctx, next) => {
        ctx.globalMiddlewareFired = true;
        next();
      })
      .navigate('/test/chainable')
      .back()
      .forward()
      .unregister()

    expect(calledTimes).toBe(1)
  })
})
