const PROVINCES = [
  {name:'Hà Nội',lat:21.0285,lon:105.8542},{name:'Cao Bằng',lat:22.6666,lon:106.2639},{name:'Tuyên Quang',lat:21.8236,lon:105.2143},
  {name:'Điện Biên',lat:21.3860,lon:103.0230},{name:'Lai Châu',lat:22.3862,lon:103.4703},{name:'Sơn La',lat:21.3256,lon:103.9188},
  {name:'Lào Cai',lat:22.4856,lon:103.9707},{name:'Thái Nguyên',lat:21.5942,lon:105.8482},{name:'Lạng Sơn',lat:21.8537,lon:106.7610},
  {name:'Quảng Ninh',lat:20.9514,lon:107.0734},{name:'Bắc Ninh',lat:21.1861,lon:106.0763},{name:'Phú Thọ',lat:21.3228,lon:105.4019},
  {name:'Hải Phòng',lat:20.8449,lon:106.6881},{name:'Hưng Yên',lat:20.6464,lon:106.0511},{name:'Ninh Bình',lat:20.2506,lon:105.9745},
  {name:'Thanh Hóa',lat:19.8067,lon:105.7852},{name:'Nghệ An',lat:18.6796,lon:105.6813},{name:'Hà Tĩnh',lat:18.3559,lon:105.8877},
  {name:'Quảng Trị',lat:16.8163,lon:107.1003},{name:'Huế',lat:16.4637,lon:107.5909},{name:'Đà Nẵng',lat:16.0544,lon:108.2022},
  {name:'Quảng Ngãi',lat:15.1205,lon:108.7923},{name:'Gia Lai',lat:13.9833,lon:108.0000},{name:'Khánh Hòa',lat:12.2388,lon:109.1967},
  {name:'Đắk Lắk',lat:12.6667,lon:108.0500},{name:'Lâm Đồng',lat:11.9404,lon:108.4583},{name:'Đồng Nai',lat:10.9574,lon:106.8427},
  {name:'Thành phố Hồ Chí Minh',lat:10.7769,lon:106.7009},{name:'Tây Ninh',lat:11.3352,lon:106.1099},{name:'Đồng Tháp',lat:10.4549,lon:105.6340},
  {name:'Vĩnh Long',lat:10.2537,lon:105.9722},{name:'An Giang',lat:10.3864,lon:105.4352},{name:'Cần Thơ',lat:10.0452,lon:105.7469},
  {name:'Cà Mau',lat:9.1769,lon:105.1524}
];

const $ = (id)=>document.getElementById(id);
const clamp = (v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const fmt = (n,d=1)=>Number.isFinite(n)?n.toFixed(d):'--';

const provinceSelect=$('provinceSelect'), provinceSearch=$('provinceSearch'), datalist=$('provinceList');
PROVINCES.forEach((p,i)=>{
  const opt=document.createElement('option'); opt.value=i; opt.textContent=p.name; provinceSelect.appendChild(opt);
  const d=document.createElement('option'); d.value=p.name; datalist.appendChild(d);
});
provinceSelect.value = PROVINCES.findIndex(p=>p.name==='Lào Cai');
provinceSearch.value = 'Lào Cai';

const map=L.map('map',{zoomControl:true}).setView([16.5,106.5],6);
const topo=L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{maxZoom:17,attribution:'Map data © OpenStreetMap contributors, SRTM | Map style © OpenTopoMap (CC-BY-SA)'});
const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'});
topo.addTo(map);
let activeLayer=topo, marker=null, rainChart=null;

$('mapLayer').addEventListener('change',e=>{
  map.removeLayer(activeLayer); activeLayer=e.target.value==='topo'?topo:osm; activeLayer.addTo(map);
});

provinceSelect.addEventListener('change',()=>{
  const p=PROVINCES[+provinceSelect.value]; provinceSearch.value=p.name;
});
provinceSearch.addEventListener('change',()=>{
  const q=provinceSearch.value.trim().toLowerCase();
  const idx=PROVINCES.findIndex(p=>p.name.toLowerCase()===q);
  if(idx>=0) provinceSelect.value=idx;
});
$('analyzeBtn').addEventListener('click',async()=>{
  const q=provinceSearch.value.trim();
  const exact=PROVINCES.find(p=>normalize(p.name)===normalize(q));
  if(exact) return analyzeLocation(exact.lat,exact.lon,exact.name);
  await geocodeAndAnalyze(q);
});
map.on('click',e=>analyzeLocation(e.latlng.lat,e.latlng.lng,'Điểm được chọn trên bản đồ'));

function normalize(s){return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().trim();}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3200)}
function loading(on){$('loadingOverlay').classList.toggle('hidden',!on)}

async function geocodeAndAnalyze(query){
  if(!query) return toast('Hãy nhập tên tỉnh/thành hoặc địa điểm.');
  loading(true);
  try{
    const url=`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=vi&countryCode=VN&format=json`;
    const data=await fetchJSON(url);
    const r=data.results?.[0];
    if(!r) throw new Error('Không tìm thấy địa điểm tại Việt Nam.');
    await analyzeLocation(r.latitude,r.longitude,[r.name,r.admin1].filter(Boolean).join(', '),false);
  }catch(e){toast(e.message||'Không thể tìm địa điểm.')}finally{loading(false)}
}

async function analyzeLocation(lat,lon,label='Khu vực đang chọn',manageLoading=true){
  if(manageLoading) loading(true);
  try{
    const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
    weatherUrl.searchParams.set('latitude',lat); weatherUrl.searchParams.set('longitude',lon);
    weatherUrl.searchParams.set('current','temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m,wind_gusts_10m');
    weatherUrl.searchParams.set('hourly','precipitation,rain,precipitation_probability,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,temperature_2m,relative_humidity_2m');
    weatherUrl.searchParams.set('daily','weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max');
    weatherUrl.searchParams.set('timezone','Asia/Bangkok'); weatherUrl.searchParams.set('forecast_days','7'); weatherUrl.searchParams.set('past_days','3');

    const offset=0.01;
    const lats=[lat,lat+offset,lat-offset,lat,lat];
    const lons=[lon,lon,lon,lon+offset,lon-offset];
    const elevationUrl=`https://api.open-meteo.com/v1/elevation?latitude=${lats.join(',')}&longitude=${lons.join(',')}`;
    const [weather,elev]=await Promise.all([fetchJSON(weatherUrl),fetchJSON(elevationUrl)]);
    const terrain=estimateTerrain(lat,elev.elevation||[]);
    const model=buildRiskModel(weather,terrain);
    renderAll({lat,lon,label,weather,terrain,model});
  }catch(e){console.error(e);toast('Không tải được dữ liệu. Hãy kiểm tra kết nối Internet hoặc thử lại.')}finally{if(manageLoading)loading(false)}
}

async function fetchJSON(url){
  const res=await fetch(url); if(!res.ok) throw new Error(`API lỗi ${res.status}`); return res.json();
}

function estimateTerrain(lat,e){
  const center=e[0]??NaN;
  const north=e[1]??center,south=e[2]??center,east=e[3]??center,west=e[4]??center;
  const nsDist=1113; const ewDist=1113*Math.cos(lat*Math.PI/180);
  const grads=[Math.abs(north-center)/nsDist,Math.abs(south-center)/nsDist,Math.abs(east-center)/ewDist,Math.abs(west-center)/ewDist].filter(Number.isFinite);
  const maxGrad=grads.length?Math.max(...grads):0;
  return {elevation:center,slopeDeg:Math.atan(maxGrad)*180/Math.PI};
}

function buildRiskModel(w,t){
  const h=w.hourly||{}; const now=Date.now();
  const times=(h.time||[]).map(x=>new Date(x).getTime());
  const start=times.findIndex(x=>x>=now-45*60*1000);
  const i0=start>=0?start:Math.max(0,times.length-1);
  const p=h.precipitation||[];
  const pastSlice=(hrs)=>p.slice(Math.max(0,i0-hrs),i0).filter(Number.isFinite);
  const nearSlice=p.slice(Math.max(0,i0-12),i0+24).filter(Number.isFinite);
  const rain24=pastSlice(24).reduce((a,b)=>a+b,0);
  const rain72=pastSlice(72).reduce((a,b)=>a+b,0);
  const maxHourly=Math.max(0,...nearSlice);
  const soil=((h.soil_moisture_0_to_1cm?.[i0]??0)+(h.soil_moisture_1_to_3cm?.[i0]??0))/2;

  const factors={
    rain24:clamp(rain24/120),
    rain72:clamp(rain72/260),
    intensity:clamp(maxHourly/30),
    soil:clamp((soil-0.15)/0.35),
    slope:clamp(t.slopeDeg/35)
  };
  const raw=100*(.30*factors.rain24+.20*factors.rain72+.15*factors.intensity+.20*factors.soil+.15*factors.slope);
  const synergy=(factors.rain72>.55 && factors.slope>.45?8:0)+(factors.soil>.7&&factors.rain24>.5?7:0);
  const score=Math.round(clamp(raw+synergy,0,100));
  let level='Thấp', cls='low', color='#58d68d';
  if(score>=75){level='Rất cao',cls='critical',color='#ff5f6d'} else if(score>=55){level='Cao',cls='high',color='#ff9138'} else if(score>=30){level='Trung bình',cls='medium',color='#f5c451'}
  return {score,level,cls,color,rain24,rain72,maxHourly,soil,factors};
}

function renderAll({lat,lon,label,weather,terrain,model}){
  $('locationTitle').textContent=label;
  $('coordsBadge').textContent=`${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  $('updatedAt').textContent='Cập nhật: '+new Date().toLocaleString('vi-VN');
  if(marker) marker.remove();
  marker=L.marker([lat,lon]).addTo(map).bindPopup(`<strong>${escapeHtml(label)}</strong><br>Đang phân tích nguy cơ sạt lở`).openPopup();
  map.setView([lat,lon],9);

  const c=weather.current||{};
  $('temperature').textContent=`${fmt(c.temperature_2m)} °C`;
  $('humidity').textContent=`${fmt(c.relative_humidity_2m,0)} %`;
  $('currentRain').textContent=`${fmt(c.precipitation)} mm`;
  $('wind').textContent=`${fmt(c.wind_speed_10m)} km/h`;
  $('elevation').textContent=`${fmt(terrain.elevation,0)} m`;
  $('slopeMetric').textContent=`${fmt(terrain.slopeDeg)}°`;
  $('weatherText').textContent=weatherCodeText(c.weather_code);

  $('riskScore').textContent=model.score;
  const rl=$('riskLevel'); rl.textContent=model.level; rl.className='risk-label '+model.cls;
  const gauge=$('riskGauge'); gauge.style.setProperty('--score',model.score); gauge.style.setProperty('--gauge-color',model.color);
  $('rain24').textContent=`${fmt(model.rain24)} mm`;
  $('rain72').textContent=`${fmt(model.rain72)} mm`;
  $('maxRain').textContent=`${fmt(model.maxHourly)} mm/h`;
  $('soilMoisture').textContent=`${fmt(model.soil*100,0)} %*`;
  $('slope').textContent=`${fmt(terrain.slopeDeg)}°`;
  setBar('rain24Bar',model.factors.rain24);setBar('rain72Bar',model.factors.rain72);setBar('maxRainBar',model.factors.intensity);setBar('soilBar',model.factors.soil);setBar('slopeBar',model.factors.slope);

  $('riskSummary').textContent = summaryFor(model);
  $('explainText').innerHTML = explainFor(model,terrain);
  renderChart(weather.daily||{});
  renderForecast(weather.daily||{},model,terrain);
}

function setBar(id,val){$(id).style.width=`${Math.round(clamp(val)*100)}%`}
function summaryFor(m){
  if(m.score>=75) return 'Nhiều yếu tố bất lợi đang cùng xuất hiện. Cần theo dõi chặt lượng mưa, sườn dốc và các cảnh báo chính thức tại địa phương.';
  if(m.score>=55) return 'Điều kiện mưa/độ ẩm/địa hình cho thấy nguy cơ tăng. Nên tăng tần suất giám sát ở khu vực sườn dốc, taluy và nơi có dấu hiệu nứt trượt.';
  if(m.score>=30) return 'Có một số yếu tố cần chú ý nhưng chưa hội tụ mạnh. Tiếp tục theo dõi mưa tích lũy và độ ẩm đất.';
  return 'Các biến đầu vào tại điểm đại diện hiện chưa cho thấy nguy cơ cao. Vẫn cần theo dõi khi có mưa lớn kéo dài hoặc cảnh báo địa phương.';
}
function explainFor(m,t){
  const items=[['mưa 24 giờ',m.factors.rain24],['mưa 72 giờ',m.factors.rain72],['cường độ mưa',m.factors.intensity],['độ ẩm đất',m.factors.soil],['độ dốc',m.factors.slope]].sort((a,b)=>b[1]-a[1]);
  const top=items.slice(0,2).map(x=>`<strong>${x[0]}</strong>`).join(' và ');
  return `Điểm nguy cơ <strong>${m.score}/100</strong> được tính bằng mô hình chấm điểm đa biến thử nghiệm. Hai yếu tố đóng góp lớn nhất hiện là ${top}. Độ cao DEM tại điểm khoảng <strong>${fmt(t.elevation,0)} m</strong>, độ dốc lân cận ước tính <strong>${fmt(t.slopeDeg)}°</strong>. <br><small>* Độ ẩm đất được quy đổi thành % tương đối từ giá trị thể tích của mô hình thời tiết, không phải cảm biến đo trực tiếp tại hiện trường.</small>`;
}
function renderChart(d){
  const labels=(d.time||[]).map(x=>new Date(x).toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit'}));
  const values=d.precipitation_sum||[];
  if(rainChart) rainChart.destroy();
  rainChart=new Chart($('rainChart'),{type:'bar',data:{labels,datasets:[{label:'Mưa (mm)',data:values,borderWidth:0,borderRadius:7,backgroundColor:'rgba(85,167,255,.7)',hoverBackgroundColor:'rgba(49,214,200,.9)'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:(ctx)=>`${ctx.parsed.y} mm`}}},scales:{x:{grid:{display:false},ticks:{color:'#8fa8c4'}},y:{beginAtZero:true,grid:{color:'rgba(143,168,196,.10)'},ticks:{color:'#8fa8c4'},title:{display:true,text:'mm',color:'#7189a2'}}}}});
}
function renderForecast(d,model,terrain){
  const wrap=$('forecastStrip'); wrap.innerHTML='';
  (d.time||[]).forEach((date,i)=>{
    const el=document.createElement('article');el.className='forecast-day';
    const day=new Date(date).toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit'});
    const rain=d.precipitation_sum?.[i]??0; const prob=d.precipitation_probability_max?.[i]??0;
    const dayScore=Math.round(clamp(100*(0.42*clamp(rain/100)+0.13*clamp(prob/100)+0.20*model.factors.soil+0.25*clamp(terrain.slopeDeg/35)),0,100));
    const dayRisk=dayScore>=75?'Rất cao':dayScore>=55?'Cao':dayScore>=30?'Trung bình':'Thấp';
    el.innerHTML=`<div class="day">${day}</div><div class="icon">${weatherIcon(d.weather_code?.[i])}</div><div class="rain">${fmt(rain)} mm</div><small>Xác suất mưa ${fmt(prob,0)}%</small><small>${fmt(d.temperature_2m_min?.[i])}–${fmt(d.temperature_2m_max?.[i])}°C</small><small><strong>Nguy cơ dự báo: ${dayRisk} (${dayScore}/100)</strong></small>`;
    wrap.appendChild(el);
  });
}
function weatherIcon(code){if(code==null)return'☁️';if(code===0)return'☀️';if([1,2].includes(code))return'🌤️';if(code===3)return'☁️';if([45,48].includes(code))return'🌫️';if(code>=51&&code<=67)return'🌧️';if(code>=80&&code<=82)return'🌦️';if(code>=95)return'⛈️';return'☁️'}
function weatherCodeText(code){const map={0:'Trời quang',1:'Ít mây',2:'Có mây',3:'Nhiều mây',45:'Sương mù',48:'Sương mù',51:'Mưa phùn nhẹ',53:'Mưa phùn',55:'Mưa phùn mạnh',61:'Mưa nhẹ',63:'Mưa vừa',65:'Mưa lớn',80:'Mưa rào nhẹ',81:'Mưa rào',82:'Mưa rào mạnh',95:'Dông',96:'Dông kèm mưa đá',99:'Dông mạnh'};return map[code]||'Thời tiết hiện tại'}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

analyzeLocation(PROVINCES[6].lat,PROVINCES[6].lon,PROVINCES[6].name);
