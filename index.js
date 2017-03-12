/* eslint-env node */

const path       = require('path')
const resolve    = require('resolve')
const Funnel     = require('broccoli-funnel')
const mergeTrees = require('broccoli-merge-trees')



module.exports = {

  name: 'ember-prismic',



  included (app) {
    this._super.included.apply(this, arguments)

    // Not sure if this snippet is necessary here.
    // "@tbieniek: this code is needed if you want your addon to run in other addons."
    // More info here: https://github.com/ember-cli/ember-cli/issues/3718
    while (typeof app.import !== 'function' && app.app) {
      app = app.app
    }

    this._importPrismicJS(app)
  },



  treeForVendor (tree) {
    tree = this._mergeTrees(
      tree,
      this._generateTreeForPrismic()
    )

    return this._super.treeForVendor.call(this, tree)
  },



  _mergeTrees (...trees) {
    trees = trees.filter(tree => tree != null) // Compact (remove nully values)
    return mergeTrees(trees)
  },



  _importPrismicJS (app) {
    app.import("vendor/prismic.io/prismic.io.js")

    // Import ES module shim
    app.import('vendor/shims/prismic.js', { exports: { 'line-height': ['default'] } })
  },



  _generateTreeForPrismic () {
    // prismic.io main file is within lib/, we need dist/
    const modulePath = path.join(path.dirname(resolve.sync('prismic.io')), '..')

    return new Funnel(modulePath, {
      srcDir:  'dist',
      files:   ['prismic.io.js'],
      destDir: '/prismic.io',
    })
  },

}
