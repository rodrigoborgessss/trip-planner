# TripPlanner

Planeador de viagens. Dizes onde estás, defines um raio (km) ou um tempo de voo
máximo, e o mapa pinta os destinos ao teu alcance. A partir daí podes pesquisar
voos, estadia, deslocações e o que há para fazer, ou pedir uma surpresa.

## Como correr

Precisa de Node 18 ou superior (usa o `fetch` nativo). Tem de ser servido pelo
Node — abrir o HTML direto do disco não funciona por causa dos módulos JS.

```bash
npm install
npm start
# abre http://localhost:3000
```

Durante o desenvolvimento, `npm run dev` reinicia o servidor a cada alteração.

## Estrutura

```
tripplanner/
├── server/                 backend (Node + Express)
│   ├── index.js            arranque: serve o frontend e a API
│   ├── config.js           porta e chaves de API (via .env)
│   ├── models/schema.js    schema normalizado (o contrato de dados)
│   ├── routes/             /api/search e /api/destinations
│   ├── services/           adaptadores das APIs externas (voos, hotéis, etc.)
│   └── cache/store.js      cache em memória para dados estáticos
└── public/                 frontend (HTML/CSS/JS puro, sem framework)
    ├── index.html          apresentação
    ├── search.html         o mapa (ecrã principal)
    ├── results.html        apresentação automática (cartões)
    ├── browse.html         navegação manual continente > país > destino
    ├── destination.html    página dedicada de um destino (separadores)
    └── assets/
        ├── css/            tokens, base e estilos do mapa
        └── js/
            ├── config.js   config do frontend
            ├── state.js    estado da pesquisa (persiste entre páginas)
            ├── map/        mapa, origem, alcance e aeroportos
            ├── ui/         consola, modal de destino, toast
            └── pages/      controlador de cada página
    └── data/airports.json  aeroportos reais (OurAirports, serviço regular)
```

## Como funciona o mapa

- O alcance é uma "bolha" geodésica (distância real, turf.js). Quando o raio
  chega a um polo, a zona fecha-se pelo topo do mapa em vez de abrir numa
  parábola — Mercator não mostra os polos, e assim lê-se como "tudo deste lado
  está ao alcance".
- O modo "tempo de voo" é uma estimativa: `tempo ≈ distância / 800 km/h +
  45 min`, e assume voo direto. Não substitui rotas reais.
- A parte de cada país dentro do alcance é pintada por interseção; a de fora
  mantém a cor normal.
- Ao aproximares o zoom aparecem aeroportos reais que estão ao alcance e na
  área visível (grandes primeiro, médios a partir de mais perto). Clicar abre
  o destino.
- O círculo acompanha o slider em tempo real; a pintura corre logo a seguir.

## Mobile

A consola vira folha inferior recolhível (toca no puxador para abrir/fechar) e
os alvos de toque são maiores. O resto do layout adapta-se à largura.

## Onde mexer

- Cores e fontes: `public/assets/css/tokens.css`.
- Limites do raio/tempo, tiles do mapa, parâmetros de voo: `public/assets/js/config.js`.
- Forma dos dados: `server/models/schema.js`. Todos os serviços normalizam para aqui.

## Ligar APIs

Os ficheiros em `server/services/` normalizam para o schema. O de voos
(`flights.js`) já está pronto para a Duffel: assim que puseres o `DUFFEL_TOKEN`
no `.env`, a pesquisa passa a ser real (sem token, devolve um voo de exemplo).
Os voos só são pesquisados quando o destino tem aeroporto (código IATA); ao
clicar num país, é auto-selecionado o aeroporto principal desse país (o de mais
rotas), por isso nunca avanças sem aeroporto.

Os extras (`safety.js`) já trazem dados reais e gratuitos, sem chave:
clima pelo Open-Meteo (previsão até ~16 dias; além disso, média do ano anterior
nas mesmas datas) e segurança pelo travel-advisory.info (índice 0–5 com fonte).
Notícias, visto e sentimento continuam por ligar.

As fotos das cidades (cartões e cabeçalho do destino) vêm da Wikipedia, sem
chave e carregadas só quando entram no ecrã; se não houver foto, fica o fundo.

Nota: o portal self-service da Amadeus encerra a 17 de julho de 2026. E não
caches preços de voos/hotéis — expiram depressa e muitos fornecedores não o
permitem nos termos de uso.
