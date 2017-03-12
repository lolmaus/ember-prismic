import Service from 'ember-service'
import service from 'ember-service/inject'
import {camelize} from 'ember-string'
import RSVP from 'rsvp'

import computed from 'ember-macro-helpers/computed'
import config from 'ember-get-config'

import Prismic from 'prismic'

import flatten   from 'ember-prismic/utils/flatten'
import mapBy     from 'ember-prismic/utils/map-by'
import times     from 'ember-prismic/utils/times'



const PAGE_SIZE_MAX = 100



export default Service.extend({
  store: service(),



  apiPromise: computed(() => Prismic.api(config.prismic.apiURL)),



  findAllDocuments () {
    const store = this.get('store')

    return this
      .queryAll()
      .then(payload => this.serializeAll(payload))
      .then(result => store.push(result))
  },

  queryAll () {
    return this
      .get('apiPromise')

      // Query first page
      .then(api => RSVP.hash({
        api,
        firstPageResponse: api.query('', {pageSize: PAGE_SIZE_MAX})
      }))

      // Query other pages
      .then(({api, firstPageResponse}) => RSVP.hash({
        api,
        firstPageResponse,
        otherPageResponses: RSVP.all(
          times(firstPageResponse.total_pages - 1)
            .map((_, i) => api.query('', {pageSize: PAGE_SIZE_MAX, page: i + 2}))
        )
      }))

      // Merge results
      .then(({api, firstPageResponse, otherPageResponses}) => {
        const results = [
          ...firstPageResponse.results,
          ...flatten(mapBy(otherPageResponses, 'results'))
        ]

        return {
          results,

          license            : firstPageResponse.license,
          next_page          : null,
          page               : 1,
          prev_page          : null,
          results_per_page   : results.length,
          results_size       : results.length,
          total_pages        : 1,
          total_results_size : results.length,
          version            : firstPageResponse.version,
        }
      })

  },

  serializeAll (payload) {
    return {
      data: payload.results.map(document => this.serializeDocument(document)),
      meta: payload.meta
    }
  },

  serializeDocument (document) {
    return {
      id            : document.id,
      type          : document.type,
      attributes    : this.serializeAttributes(document),
      relationships : this.serializeRelationships(document)
    }
  },

  serializeAttributes (document) {
    const attributes = document.data

    const result =
      Object
        .keys(attributes)
        .filter(key => attributes[key].type !== "Link.document")
        .reduce((result, keyWithType) => {
          // const value         = attributes[keyWithType]
          const keyWithoutType = camelize(keyWithType.split('.')[1])

          result[keyWithoutType] = this.serializeAttribute(document, keyWithType)

          return result
        }, {})

    result.document = document
    result.tags     = document.tags
    result.uid      = document.uid

    return result
  },

  serializeAttribute (document, keyWithType) {
    const attribute = document.data[keyWithType]
    const methodName = `serializeAttribute__${attribute.type}`

    if (typeof this[methodName] === 'function') {
      return this[methodName](document, keyWithType)
    }

    return attribute.value
  },

  serializeAttribute__Number (document, keyWithType) {
    return document.getNumber(keyWithType)
  },

  "serializeAttribute__Link.web" (document, keyWithType) {
    return document.data[keyWithType].value.url
  },

  "serializeAttribute__Link.image" (document, keyWithType) {
    return document.data[keyWithType].value.image
  },

  serializeAttribute__StructuredText (document, keyWithType) {
    return document.getHtml(keyWithType)
  },

  serializeRelationships (document) {
    const attributes = document.data

    return Object
      .keys(attributes)
      .filter(key => attributes[key].type === "Link.document")
      .reduce((result, keyWithType) => {
        const relationship   = attributes[keyWithType]
        const keyWithoutType = keyWithType.split('.')[1]

        if (!relationship.value.isBroken) {
          result[keyWithoutType] = {
            data: {
              id   : relationship.value.document.id,
              type : relationship.value.document.type
            }
          }
        }

        return result
      }, {})
  },

})
