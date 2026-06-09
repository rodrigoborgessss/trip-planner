// Adaptador de lazer/cultura (stub). Opções: OpenTripMap (gratuito),
// Foursquare/Google Places, afiliados GetYourGuide/Viator.
async function searchActivities({ lat, lng }) {
  return {
    leisure: [{ id: 'l-1', name: 'Miradouro Exemplo', category: 'vista', rating: 4.7, price: 0, lat, lng, source: 'mock' }],
    culture: [{ id: 'c-1', name: 'Museu Exemplo', category: 'museu', rating: 4.5, lat, lng, source: 'mock' }],
  };
}
module.exports = { searchActivities };
