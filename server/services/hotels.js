// Adaptador de hotéis (stub). Normaliza para o schema.
// Opções: Amadeus Hotel (enquanto durar), RateHawk, Hotelbeds, ou afiliado Booking.
async function searchHotels({ lat, lng, checkin, checkout, pax }) {
  return [
    { id: 'h-1', name: 'Hotel Exemplo', stars: 4, pricePerNight: 80, currency: 'EUR',
      rating: 8.6, lat, lng, photo: null, deeplink: '#' },
  ];
}
module.exports = { searchHotels };
