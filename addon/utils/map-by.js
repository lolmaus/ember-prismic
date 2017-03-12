import get from 'ember-metal/get'



export default function mapBy (array, propName) {
  return array.map(item => get(item, propName))
}
