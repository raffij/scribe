define(function () {

  /**
   * Sets the default content of the scribe so that each carriage return creates
   * a P.
   */

  'use strict';

  return function () {
    return function (scribe) {
      // The content might have already been set, in which case we don't want
      // to apply.
      if (scribe.getHTML().trim() === '') {
        /**
         * We have to begin with the following HTML, because otherwise some
         * browsers(?) will position the caret outside of the P when the scribe is
         * focused.
         */

        // Force IE10 to not include br otherwise a linebreak is always included
        // in the textarea.
        if(window.navigator.userAgent.match(/MSIE 10/)) {
          scribe.setContent('<p></p>');
        } else {
          scribe.setContent('<p><br></p>');
        }
      }
    };
  };

});
