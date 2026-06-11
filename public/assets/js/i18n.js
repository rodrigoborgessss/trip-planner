// i18n PT/EN. Guarda o idioma em localStorage. Ao trocar, recarrega a página
// (o estado fica em sessionStorage, por isso não se perde nada).
const DICT = {
  pt: {
    'console': 'console',
    'nav.map': '← Mapa', 'nav.results': 'Resultados', 'nav.explore': 'Explorar',
    's.from': 'De onde partes', 's.airport': 'Aeroporto de partida',
    's.airportPh': 'ex.: LIS — Lisboa',
    's.dragHint': 'Arrasta o ponto no mapa para corrigir a tua origem.',
    's.criterion': 'Critério de alcance', 's.noLimit': 'Sem limite — o mundo todo',
    's.radius': 'Raio (km)', 's.flightTime': 'Tempo de voo',
    's.trip': 'A tua viagem', 's.out': 'Ida', 's.back': 'Volta',
    's.roundTrip': 'Ida e volta', 's.oneWay': 'Só ida', 's.travelers': 'Viajantes',
    's.budget': 'Orçamento máx.', 's.budgetPh': 'ex.: 800', 's.currency': 'Moeda',
    's.nationality': 'Nacionalidade (para vistos)',
    'step.origin': 'Origem', 'step.range': 'Alcance', 'step.dest': 'Destino',
    's.reach': 'Destinos ao alcance',
    'btn.search': 'Pesquisar destinos', 'btn.surprise': '🎲 Surpreende-me',
    'btn.browse': 'Explorar manualmente', 's.criteria': 'Critérios',
    'reopen': 'Critérios ⤴',
    'modal.setDeparture': '✈ Definir como partida', 'modal.viewDest': 'Ver destino',
    'm.distance': 'Distância', 'm.flightEst': 'Voo estimado', 'm.total': 'Total estimado',
    'tab.flights': 'Voos', 'tab.hotels': 'Hotéis', 'tab.transport': 'Deslocações',
    'tab.leisure': 'Lazer', 'tab.culture': 'Cultura', 'tab.extras': 'Extras',
    'r.title': 'Destinos', 'sort.distance': 'Distância', 'sort.time': 'Tempo de voo', 'sort.name': 'Nome',
    'res.inRange': 'ao alcance', 'res.showing': 'a mostrar', 'res.see': 'Ver voos e preços →',
    'res.none': 'Nada ao alcance com estes critérios.',
    'fl.direct': 'direto', 'fl.stops': 'escala(s)', 'fl.total': 'total', 'fl.book': 'Reservar →',
    'fl.pickAirport': 'Escolhe um aeroporto no mapa para veres voos.',
    'ht.night': '/noite', 'ht.for': 'por', 'ht.nights': 'noite(s)', 'ht.see': 'Ver →', 'ht.searchIn': 'Procurar em', 'ht.book': 'Reservar →', 'ht.hotel': 'hotel',
    'x.safety': '🛡️ Segurança', 'x.weather': '🌤️ Clima', 'x.visa': '🎫 Visto / entrada',
    'x.news': '📰 Notícias recentes', 'x.sentiment': '📊 Sentimento no país',
    'x.noData': 'Sem dados ainda.', 'x.source': 'fonte',
    'b.continents': 'Continentes', 'b.loadingC': 'A carregar continentes…',
    'mode.radiusHint': 'A zona dourada mostra tudo a este raio em linha reta da tua origem.',
    'mode.timeHint': 'A zona azul estima os países alcançáveis neste tempo de voo direto.',
    'idx.kicker': 'Planeia · Voa · Descobre',
    'idx.lead': 'Define um raio ou um tempo de voo e o mapa pinta os destinos ao teu alcance. Voos, estadia, deslocações e o que há para fazer — tudo num sítio. Sem ideias? Carrega em surpresa.',
    'idx.start': 'Começar',
    'idx.h1': 'Diz-me onde estás.<br>Eu mostro-te <em>até onde dá para ir</em>.',
    'idx.f1': 'Mapa por raio ou tempo de voo', 'idx.f2': 'Voos + hotéis + deslocação',
    'idx.f3': 'Lazer e cultura', 'idx.f4': 'Modo surpresa',
    'readout.flightEst': 'de voo<br>direto estimado', 'readout.inFlight': 'em voo direto',
    'tr.airport': 'Do aeroporto ao centro', 'tr.transit': 'Transportes públicos', 'tr.taxi': 'Boleias e táxis', 'tr.car': 'Aluguer de viaturas', 'misc.loading': 'A carregar…', 'trip.create': 'Criar viagem',
    'trip.title': 'Plano de viagem', 'trip.pdf': 'Guardar PDF', 'trip.back': 'Voltar',
    'trip.flight': 'Voo', 'trip.hotel': 'Estadia', 'trip.transport': 'Como te deslocares',
    'trip.day': 'Dia', 'trip.budget': 'Orçamento', 'trip.book': 'Reservar', 'trip.from': 'De',
    'trip.nights': 'noites', 'trip.travellers': 'viajantes', 'trip.noflight': 'Escolhe um aeroporto para incluir voo.',
    'trip.intro': 'Plano sugerido com base nas tuas datas e orçamento. Os preços de voo são reais; hotel e atividades confirmas no parceiro.',
  },
  en: {
    'console': 'console',
    'nav.map': '← Map', 'nav.results': 'Results', 'nav.explore': 'Explore',
    's.from': 'Where you fly from', 's.airport': 'Departure airport',
    's.airportPh': 'e.g. LIS — Lisbon',
    's.dragHint': 'Drag the point on the map to fix your origin.',
    's.criterion': 'Range criterion', 's.noLimit': 'No limit — the whole world',
    's.radius': 'Radius (km)', 's.flightTime': 'Flight time',
    's.trip': 'Your trip', 's.out': 'Departure', 's.back': 'Return',
    's.roundTrip': 'Round trip', 's.oneWay': 'One way', 's.travelers': 'Travellers',
    's.budget': 'Max budget', 's.budgetPh': 'e.g. 800', 's.currency': 'Currency',
    's.nationality': 'Nationality (for visas)',
    'step.origin': 'Origin', 'step.range': 'Range', 'step.dest': 'Destination',
    's.reach': 'Destinations in range',
    'btn.search': 'Search destinations', 'btn.surprise': '🎲 Surprise me',
    'btn.browse': 'Browse manually', 's.criteria': 'Filters',
    'reopen': 'Filters ⤴',
    'modal.setDeparture': '✈ Set as departure', 'modal.viewDest': 'View destination',
    'm.distance': 'Distance', 'm.flightEst': 'Est. flight', 'm.total': 'Est. total',
    'tab.flights': 'Flights', 'tab.hotels': 'Hotels', 'tab.transport': 'Transport',
    'tab.leisure': 'Leisure', 'tab.culture': 'Culture', 'tab.extras': 'Extras',
    'r.title': 'Destinations', 'sort.distance': 'Distance', 'sort.time': 'Flight time', 'sort.name': 'Name',
    'res.inRange': 'in range', 'res.showing': 'showing', 'res.see': 'See flights & prices →',
    'res.none': 'Nothing in range with these criteria.',
    'fl.direct': 'direct', 'fl.stops': 'stop(s)', 'fl.total': 'total', 'fl.book': 'Book →',
    'fl.pickAirport': 'Pick an airport on the map to see flights.',
    'ht.night': '/night', 'ht.for': 'for', 'ht.nights': 'night(s)', 'ht.see': 'View →', 'ht.searchIn': 'Search in', 'ht.book': 'Book →', 'ht.hotel': 'hotel',
    'x.safety': '🛡️ Safety', 'x.weather': '🌤️ Weather', 'x.visa': '🎫 Visa / entry',
    'x.news': '📰 Recent news', 'x.sentiment': '📊 Country sentiment',
    'x.noData': 'No data yet.', 'x.source': 'source',
    'b.continents': 'Continents', 'b.loadingC': 'Loading continents…',
    'mode.radiusHint': 'The amber zone shows everything within this straight-line radius of your origin.',
    'mode.timeHint': 'The blue zone estimates the countries reachable within this direct flight time.',
    'idx.kicker': 'Plan · Fly · Discover',
    'idx.lead': 'Set a radius or a flight time and the map paints the destinations within your reach. Flights, stays, transport and things to do — all in one place. No ideas? Hit surprise.',
    'idx.start': 'Get started',
    'idx.h1': "Tell me where you are.<br>I'll show you <em>how far you can go</em>.",
    'idx.f1': 'Map by radius or flight time', 'idx.f2': 'Flights + hotels + transport',
    'idx.f3': 'Leisure & culture', 'idx.f4': 'Surprise mode',
    'readout.flightEst': 'of direct<br>flight (est.)', 'readout.inFlight': 'in direct flight',
    'tr.airport': 'Airport to city centre', 'tr.transit': 'Public transport', 'tr.taxi': 'Rides & taxis', 'tr.car': 'Car rental', 'misc.loading': 'Loading…', 'trip.create': 'Create trip',
    'trip.title': 'Trip plan', 'trip.pdf': 'Save PDF', 'trip.back': 'Back',
    'trip.flight': 'Flight', 'trip.hotel': 'Stay', 'trip.transport': 'Getting around',
    'trip.day': 'Day', 'trip.budget': 'Budget', 'trip.book': 'Book', 'trip.from': 'From',
    'trip.nights': 'nights', 'trip.travellers': 'travellers', 'trip.noflight': 'Pick an airport to include a flight.',
    'trip.intro': 'Suggested plan based on your dates and budget. Flight prices are real; confirm hotel and activities with the partner.',
  },
};

export let lang = localStorage.getItem('tp.lang') || 'pt';
document.documentElement.lang = lang;

export function t(key, fallback) {
  return (DICT[lang] && DICT[lang][key]) || (DICT.pt[key]) || fallback || key;
}

function applyDOM() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.getAttribute('data-i18n-title')); });
}

function mountToggle() {
  if (document.getElementById('langToggle')) return;
  const b = document.createElement('button');
  b.id = 'langToggle';
  b.type = 'button';
  b.title = 'PT / EN';
  b.textContent = lang === 'pt' ? 'EN' : 'PT';
  b.onclick = () => {
    lang = lang === 'pt' ? 'en' : 'pt';
    localStorage.setItem('tp.lang', lang);
    location.reload();
  };
  document.body.appendChild(b);
}

function init() { applyDOM(); mountToggle(); }
if (document.readyState !== 'loading') init();
else addEventListener('DOMContentLoaded', init);
