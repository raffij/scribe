var expect = require('chai').expect;
var webdriver = require('selenium-webdriver');
var SeleniumServer = require('selenium-webdriver/remote').SeleniumServer;

function given() {
  var args = Object.create(arguments);
  args[0] = 'given ' + args[0];
  describe.apply(null, args);
}

function when() {
  var args = Object.create(arguments);
  args[0] = 'when ' + args[0];
  describe.apply(null, args);
}

/* global describe, it, after, afterEach, before, beforeEach */

/* TODO
 * - create scribe dynamically for each context (e.g. pristine, with a plugin, etc)
 * - sanitize clearText to call scribe methods (e.g. scribe.clear() via executeScript?)
 * - rethink getInnerHTML in the light of being able to access the
 *   scribe instance; is it better to use scribe.getHTML, or how do we
 *   ensure 'content-changed' was triggered?
 * - simplify boilerplate by abstracting common test operations, e.g.
 *     when(type('hello'), function() {
 *       editorShouldContain('<p>hello</p>');
 *     });
 */

var driver;

before(function (done) {
  // Note: you need to run from the root of the project
  var server = new SeleniumServer('./vendor/selenium-server-standalone-2.37.0.jar', {
    port: 4444
  });

  server.start().then(function () {
    driver = new webdriver.Builder()
      .usingServer(server.address())
      // TODO: firefox
      .withCapabilities(webdriver.Capabilities.chrome())
      .build();

    driver.get('http://localhost:8080/test/app/index.html').then(function () {
      done();
    });
  });
});

after(function (done) {
  // FIXME: Quit fails when there was an error from the WebDriver
  driver.quit().then(function () {
    done();
  });
});

var scribe;
var editorOutput;

beforeEach(function (done) {
  driver.executeScript(setupTest).then(function () {
    done();
  });

  function setupTest() {
    require([
      'scribe'
    ], function (
      Scribe
    ) {

      'use strict';

      var scribe = new Scribe(document.querySelector('.scribe'));

      scribe.on('content-changed', updateHTML);

      function updateHTML() {
        document.querySelector('.scribe-html').textContent = scribe.el.innerHTML;
      }

      window.scribe = scribe;
    });
  }
});

beforeEach(function (done) {
  driver.wait(function () {
    return driver.executeScript('return document.readyState').then(function (returnValue) {
      return returnValue === 'complete';
    });
  }).then(function () {
    scribe = driver.findElement(webdriver.By.id('scribe'));
    editorOutput = driver.findElement(webdriver.By.id('scribe-output'));

    scribe.getInnerHTML = function () {
      return editorOutput.getText();
    };

    done();
  });
});

afterEach(function (done) {
  driver.navigate().refresh().then(function () {
    done();
  });
});

when('the user types', function () {
  beforeEach(function (done) {
    driver.executeScript(function () {
      window.scribe.initialize();
    }).then(function () {
      done();
    });
  });

  beforeEach(function (done) {
    scribe.sendKeys('1').then(function () {
      done();
    });
  });

  it('should insert the text inside of a P element', function (done) {
    scribe.getInnerHTML().then(function (innerHTML) {
      expect(innerHTML).to.equal('<p>1</p>');
      done();
    });
  });

  when('the user presses enter', function () {
    beforeEach(function (done) {
      scribe.sendKeys(webdriver.Key.ENTER).then(function () {
        done();
      });
    });

    it('should insert another P element', function (done) {
      scribe.getInnerHTML().then(function (innerHTML) {
        expect(innerHTML).to.equal('<p>1</p><p><br></p>');
        done();
      });
    });

    when('the user types', function () {
      beforeEach(function (done) {
        scribe.sendKeys('2').then(function () {
          done();
        });
      });

      it('should insert characters inside of the P element', function (done) {
        scribe.getInnerHTML().then(function (innerHTML) {
          expect(innerHTML).to.equal('<p>1</p><p>2</p>');
          done();
        });
      });
    });
  });
});

describe('toolbar', function () {
  when('the user clicks the bold button in the toolbar and then types', function () {
    beforeEach(function (done) {
      driver.executeScript(function () {
        require(['plugins/toolbar'], function (toolbar) {
          window.scribe.use(toolbar(document.querySelector('.toolbar')));
          window.scribe.initialize();
        });
      }).then(function () {
        done();
      });
    });

    beforeEach(function (done) {
      scribe.click();
      driver.findElement(webdriver.By.id('bold-button')).click();
      scribe.sendKeys('1').then(function () {
        done();
      });
    });

    it('should inserts the typed characters inside of a B element, inside of a P element', function (done) {
      scribe.getInnerHTML().then(function (innerHTML) {
        expect(innerHTML).to.equal('<p><b>1</b></p>');
        done();
      });
    });
  });
});

describe('smart lists plugin', function () {

  beforeEach(function (done) {
    driver.executeScript(function () {
      require(['plugins/smart-list'], function (smartList) {
        window.scribe.use(smartList());
        window.scribe.initialize();
      });
    }).then(function () {
      done();
    });
  });

  var unorderedPrefixes = ['* ', '- ', '• '];
  unorderedPrefixes.forEach(function(prefix) {

    when('the user types "' +prefix+ '"', function () {
      beforeEach(function (done) {
        scribe.sendKeys(prefix).then(function () {
          done();
        });
      });

      it('should create an unordered list', function (done) {
        scribe.getInnerHTML().then(function (innerHTML) {
          expect(innerHTML).to.equal('<ul><li><br></li></ul>');
          done();
        });
      });

      when('the user types', function () {
        beforeEach(function (done) {
          scribe.sendKeys('abc').then(function () {
            done();
          });
        });

        it('should insert the typed characters inside of the LI element', function (done) {
          scribe.getInnerHTML().then(function (innerHTML) {
            expect(innerHTML).to.equal('<ul><li>abc</li></ul>');
            done();
          });
        });

        when('the user presses ENTER', function () {
          beforeEach(function (done) {
            scribe.sendKeys(webdriver.Key.ENTER).then(function () {
              done();
            });
          });

          it('should create a new LI element', function (done) {
            scribe.getInnerHTML().then(function (innerHTML) {
              expect(innerHTML).to.equal('<ul><li>abc</li><li><br></li></ul>');
              done();
            });
          });

          when('the user types', function () {
            beforeEach(function (done) {
              scribe.sendKeys('def').then(function () {
                done();
              });
            });

            it('should insert the typed characters inside the new LI element', function (done) {
              scribe.getInnerHTML().then(function (innerHTML) {
                expect(innerHTML).to.equal('<ul><li>abc</li><li>def</li></ul>');
                done();
              });
            });
          });

          when('the user presses ENTER', function () {
            beforeEach(function (done) {
              scribe.sendKeys(webdriver.Key.ENTER).then(function () {
                done();
              });
            });

            it('should end the list and start a new P', function (done) {
              scribe.getInnerHTML().then(function (innerHTML) {
                expect(innerHTML).to.equal('<ul><li>abc</li></ul><p><br></p>');
                done();
              });
            });
          });
        });
      });
    });

    given('some content on the line', function () {
      beforeEach(function (done) {
        scribe.sendKeys('hello').then(function () {
          done();
        });
      });

      when('the user types "' +prefix+ '"', function () {
        beforeEach(function (done) {
          scribe.sendKeys(prefix).then(function () {
            done();
          });
        });

        it('should write these characters and not create a list', function (done) {
          scribe.getInnerHTML().then(function (innerHTML) {
            var prefixNbsp = prefix.replace(' ', '&nbsp;');
            expect(innerHTML).to.equal('<p>hello' +prefixNbsp+ '</p>');
            done();
          });
        });
      });

      when('the user goes to the start of the line and types "' +prefix+ '"', function () {
        beforeEach(function (done) {
          var goToStart = new webdriver.ActionSequence(driver)
            .click(scribe)
            .sendKeys(webdriver.Key.LEFT)
            .sendKeys(webdriver.Key.LEFT)
            .sendKeys(webdriver.Key.LEFT)
            .sendKeys(webdriver.Key.LEFT)
            .sendKeys(webdriver.Key.LEFT)
            .sendKeys(prefix)
            .perform();

          goToStart.then(function () {
            done();
          });
        });

        it('should create an unordered list containing the words on the line', function (done) {
          scribe.getInnerHTML().then(function (innerHTML) {
            expect(innerHTML).to.equal('<ul><li>hello<br></li></ul>');
            done();
          });
        });
      });
    });

  });

  // TODO: reuse steps above for ordered lists?

  when('the user types "1. "', function () {
    beforeEach(function (done) {
      scribe.sendKeys('1. ').then(function () {
        done();
      });
    });

    it('should create an ordered list', function (done) {
      scribe.getInnerHTML().then(function (innerHTML) {
        expect(innerHTML).to.equal('<ol><li><br></li></ol>');
        done();
      });
    });
  });
});

describe('curly quotes plugin', function () {

  beforeEach(function (done) {
    driver.executeScript(function () {
      require(['plugins/curly-quotes'], function (curlyQuotes) {
        window.scribe.use(curlyQuotes());
        window.scribe.initialize();
      });
    }).then(function () {
      done();
    });
  });

  given('the caret is at the beginning of a line', function () {
    when('the user types ascii double quote', function () {
      beforeEach(function (done) {
        scribe.sendKeys('"').then(function () {
          done();
        });
      });

      it('should insert an opening curly double quote instead', function (done) {
        scribe.getInnerHTML().then(function (innerHTML) {
          expect(innerHTML).to.equal('<p>“<br></p>');
          done();
        });
      });
    });
  });

  given('the caret is at the end of a word', function () {
    beforeEach(function (done) {
      scribe.sendKeys('Hello').then(function () {
        done();
      });
    });

    when('the user types ascii double quote', function () {
      beforeEach(function (done) {
        scribe.sendKeys('"').then(function () {
          done();
        });
      });

      it('should insert a closing curly double quote instead', function (done) {
        scribe.getInnerHTML().then(function (innerHTML) {
          expect(innerHTML).to.equal('<p>Hello”</p>');
          done();
        });
      });
    });
  });

  given('the caret is after the end of a word', function () {
    beforeEach(function (done) {
      scribe.sendKeys('Hello ').then(function () { // Note the space
        done();
      });
    });

    when('the user types ascii double quote', function () {
      beforeEach(function (done) {
        scribe.sendKeys('"').then(function () {
          done();
        });
      });

      it('should insert an opening curly double quote instead', function (done) {
        scribe.getInnerHTML().then(function (innerHTML) {
          // FIXME: failing, inserts nbsp!
          expect(innerHTML).to.equal('<p>Hello “</p>');
          done();
        });
      });
    });
  });
});
