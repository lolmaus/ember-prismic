export default function mapValues (hash, callback) {
  return Object
    .keys(hash)
    .reduce((result, key) => {
      result[key] = callback(hash[key], key, hash)
      return result
    })
}
