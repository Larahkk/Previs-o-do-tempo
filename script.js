const btnBuscar = document.getElementById('btn-buscar');
const inputCidade = document.getElementById('cidade');
document.addEventListener('DOMContentLoaded', () => {
  const ultimaCidade = localStorage.getItem('ultima_cidade_buscada');

  if (ultimaCidade) {
    inputCidade.value = ultimaCidade;
    buscarClimaPorCidade(ultimaCidade);
  }
});
const divResultado = document.getElementById('resultado');
const elNomeCidade = document.getElementById('nome-cidade');
const elTemp = document.getElementById('temp');
const elVento = document.getElementById('vento');
const elIconeClima = document.getElementById('icone-clima');
const elDescricaoClima = document.getElementById('descricao-clima');
const elSensacao = document.getElementById('sensacao');
const elUmidade = document.getElementById('umidade');
const elDiasPrevisao = document.getElementById('dias-previsao');
const elDetalhesDia = document.getElementById('detalhes-dia');
const elErro = document.getElementById('erro');

btnBuscar.addEventListener('click', buscarClimaPorCidade);

inputCidade.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    buscarClimaPorCidade();
  }
});

function obterCondicao(codigo) {
  if (codigo === 0) return { descricao: 'Céu limpo', icone: '☀️', tema: 'sunny' };
  if (codigo === 1) return { descricao: 'Predominantemente limpo', icone: '🌤️', tema: 'sunny' };
  if (codigo === 2) return { descricao: 'Parcialmente nublado', icone: '⛅', tema: 'cloudy' };
  if (codigo === 3) return { descricao: 'Nublado', icone: '☁️', tema: 'cloudy' };
  if (codigo === 45 || codigo === 48) {
    return { descricao: 'Neblina', icone: '🌫️', tema: 'foggy' };
  }
  if ([51, 53, 55, 56, 57].includes(codigo)) {
    return { descricao: 'Garoa', icone: '🌦️', tema: 'rainy' };
  }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(codigo)) {
    return { descricao: 'Chuva', icone: '🌧️', tema: 'rainy' };
  }
  if ([71, 73, 75, 77, 85, 86].includes(codigo)) {
    return { descricao: 'Neve', icone: '🌨️', tema: 'snowy' };
  }
  if ([95, 96, 99].includes(codigo)) {
    return { descricao: 'Tempestade', icone: '⛈️', tema: 'stormy' };
  }
  return { descricao: 'Condição indisponível', icone: '🌡️', tema: 'cloudy' };
}

function mostrarPrevisao(dadosDiarios) {
  elDiasPrevisao.replaceChildren();

  dadosDiarios.time.forEach((data, indice) => {
    const dia = document.createElement('button');
    const diaSemana = document.createElement('p');
    const icone = document.createElement('p');
    const temperaturas = document.createElement('p');
    const condicao = obterCondicao(dadosDiarios.weather_code[indice]);

    dia.className = 'dia-previsao';
    dia.type = 'button';
    dia.setAttribute('aria-pressed', 'false');
    dia.setAttribute('aria-label', `Ver detalhes da previsão de ${data}`);
    diaSemana.textContent = new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit'
    });
    diaSemana.className = 'dia-nome';
    icone.className = 'icone-dia';
    icone.setAttribute('aria-label', condicao.descricao);
    icone.textContent = condicao.icone;
    temperaturas.className = 'temperaturas';
    temperaturas.textContent =
      `${Math.round(dadosDiarios.temperature_2m_max[indice])}° / ` +
      `${Math.round(dadosDiarios.temperature_2m_min[indice])}°`;

    dia.append(diaSemana, icone, temperaturas);
    dia.addEventListener('click', () => {
      elDiasPrevisao.querySelectorAll('.dia-previsao').forEach((item) => {
        item.classList.remove('selecionado');
        item.setAttribute('aria-pressed', 'false');
      });
      dia.classList.add('selecionado');
      dia.setAttribute('aria-pressed', 'true');

      const chanceChuva = dadosDiarios.precipitation_probability_max?.[indice];
      const dataFormatada = new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
      const resumo = `${dataFormatada}: ${condicao.descricao}, mínima de ` +
        `${Math.round(dadosDiarios.temperature_2m_min[indice])}°C e máxima de ` +
        `${Math.round(dadosDiarios.temperature_2m_max[indice])}°C` +
        (chanceChuva == null ? '.' : `, ${chanceChuva}% de chance de chuva.`);
      elDetalhesDia.textContent = resumo;
    });
    elDiasPrevisao.append(dia);
  });

  elDiasPrevisao.querySelector('.dia-previsao')?.click();
}

async function buscarClimaPorCidade() {
  const nomeCidade = inputCidade.value.trim();

  divResultado.classList.add('escondido');
  divResultado.classList.remove('aparecendo');
  elErro.classList.add('escondido');

  if (!nomeCidade) {
    exibirErro('Por favor, digite o nome de uma cidade.');
    return;
  }

  btnBuscar.disabled = true;
  btnBuscar.textContent = 'Buscando...';

  try {
    const urlGeo = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nomeCidade)}&count=1&language=pt&format=json`;
    const resGeo = await fetch(urlGeo);
    if (!resGeo.ok) {
      throw new Error('Erro ao buscar a cidade. Tente novamente.');
    }
    const dadosGeo = await resGeo.json();

    if (!dadosGeo.results || dadosGeo.results.length === 0) {
      throw new Error('Cidade não encontrada. Verifique o nome e tente novamente.');
    }

    const { latitude, longitude, name, admin1, country } = dadosGeo.results[0];
    const urlClima =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      '&current=temperature_2m,wind_speed_10m,weather_code,relative_humidity_2m,apparent_temperature' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
      '&forecast_days=7&timezone=auto';
    const resClima = await fetch(urlClima);
    if (!resClima.ok) {
      throw new Error('Erro ao obter os dados do clima.');
    }

    const dadosClima = await resClima.json();
    const clima = dadosClima.current;
    if (!clima || !dadosClima.daily || !dadosClima.daily.time) {
      throw new Error('A previsão do tempo está indisponível para esta cidade.');
    }
    const condicaoAtual = obterCondicao(clima.weather_code);

    const localFormatado = admin1 ? `${name}, ${admin1} - ${country}` : `${name} - ${country}`;
    elNomeCidade.textContent = localFormatado;
    elTemp.textContent = `${clima.temperature_2m} °C`;
    elVento.textContent = `Vento: ${clima.wind_speed_10m} km/h`;
    elIconeClima.textContent = condicaoAtual.icone;
    elDescricaoClima.textContent = condicaoAtual.descricao;
    elSensacao.textContent = `Sensação: ${clima.apparent_temperature} °C`;
    elUmidade.textContent = `Umidade: ${clima.relative_humidity_2m}%`;
    document.body.dataset.weather = condicaoAtual.tema;
    mostrarPrevisao(dadosClima.daily);

    divResultado.classList.remove('escondido');
    requestAnimationFrame(() => divResultado.classList.add('aparecendo'));
  } catch (error) {
    exibirErro(error.message);
  } finally {
    btnBuscar.disabled = false;
    btnBuscar.textContent = 'Buscar Clima';
  }
}

function exibirErro(mensagem) {
  elErro.textContent = mensagem;
  elErro.classList.remove('escondido');
}