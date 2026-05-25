const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');
const axios = require('axios');

const app = express();
let qrActual = '';
let botListo = false;

app.get('/', async (req, res) => {
    if (botListo) {
        res.send('<h1 style="text-align:center; margin-top:50px; font-family:sans-serif; color:#01b574;">✅ Bot conectado y funcionando</h1>');
    } else if (qrActual) {
        const urlImagen = await qrcode.toDataURL(qrActual);
        res.send(`
            <div style="text-align:center; margin-top:50px; font-family:sans-serif;">
                <h2>Escanea este QR con tu WhatsApp</h2>
                <img src="${urlImagen}" style="width:300px; height:300px; border:1px solid #ccc; padding:10px;" />
            </div>
        `);
    } else {
        res.send('<h1 style="text-align:center; margin-top:50px; font-family:sans-serif; color:#4318ff;">⏳ Generando código QR... recarga la página en 5 segundos.</h1>');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor web encendido en puerto ${PORT}`));

// --- HERRAMIENTAS Y FUNCIONES ---
function obtenerFechaEmision() {
    let fecha = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"}));
    let diaSemana = fecha.getDay(); 
    if (diaSemana === 6) fecha.setDate(fecha.getDate() - 1);
    else if (diaSemana === 0) fecha.setDate(fecha.getDate() - 2);

    let dia = fecha.getDate();
    let meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    let mes = meses[fecha.getMonth()];
    let anio = fecha.getFullYear();

    return `CUAHUTEMOC, CIUDAD DE MEXICO, A ${dia} DE\n${mes} DE ${anio}`;
}

function calcularRFC(nombre, paterno, materno, fechaStr) {
    if (!nombre || !paterno || !fechaStr) return '';
    const limpiarCadena = (str) => str.toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-ZÑ ]/g, "");
    const filtrarPalabras = (str) => {
        const ignoradas = ["DA", "DAS", "DE", "DEL", "DER", "DI", "DIE", "DD", "EL", "LA", "LOS", "LAS", "LE", "LES", "MAC", "MC", "VAN", "VON", "Y"];
        return str.split(" ").filter(p => !ignoradas.includes(p) && p !== "").join(" ");
    };
    let nom = filtrarPalabras(limpiarCadena(nombre));
    let pat = filtrarPalabras(limpiarCadena(paterno));
    let mat = materno ? filtrarPalabras(limpiarCadena(materno)) : "";
    let nombresArr = nom.split(" ");
    if (nombresArr.length > 1 && (nombresArr[0] === "JOSE" || nombresArr[0] === "MARIA")) nombresArr.shift();
    let nombreUsado = nombresArr[0];
    let p1 = pat.charAt(0) || 'X';
    let p2 = 'X';
    for (let i = 1; i < pat.length; i++) {
        if (/[AEIOU]/.test(pat.charAt(i))) { p2 = pat.charAt(i); break; }
    }
    let m1 = mat ? mat.charAt(0) : 'X';
    let n1 = nombreUsado.charAt(0) || 'X';
    if (pat.length <= 2) {
        p2 = mat ? mat.charAt(0) : 'X';
        m1 = nombreUsado.charAt(0) || 'X';
        n1 = nombreUsado.charAt(1) || 'X';
    }
    let letras = (p1 + p2 + m1 + n1).replace(/Ñ/g, 'X');
    const antisonantes = ['BUEI','BUEY','CACA','CACO','CAGA','CAGO','CAKA','CAKO','COGE','COJA','COJE','COJI','COJO','CULO','FETO','GUEY','JOTO','KACA','KACO','KAGA','KAGO','COKA','COKO','KAKA','KAKO','KOGE','KOJO','KULO','MAME','MAMO','MEAR','MEAS','MEON','MION','MOCO','MULA','PEDA','PEDO','PENE','PUTA','PUTO','QULO','RATA','RUIN'];
    if (antisonantes.includes(letras)) letras = letras.substring(0, 3) + 'X';
    let fechaRFC = fechaStr.substring(2, 4) + fechaStr.substring(5, 7) + fechaStr.substring(8, 10);
    const caracteres = "123456789ABCDEFGHIJKLMNPQRSTUVWXYZ";
    let homo = caracteres.charAt(Math.floor(Math.random() * caracteres.length)) + caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    let rfc12 = letras + fechaRFC + homo;
    const dic = "0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ";
    let suma = 0;
    for (let i = 0; i < 12; i++) { suma += dic.indexOf(rfc12.charAt(i)) * (13 - i); }
    let mod = suma % 11;
    let digito = mod === 0 ? "0" : (11 - mod === 10 ? "A" : (11 - mod).toString());
    return rfc12 + digito;
}

function obtenerALPorEstado(estado) {
    if (!estado) return "CIUDAD DE MÉXICO 1";
    const estLimpio = estado.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const mapaAL = {
        "AGUASCALIENTES": "AGUASCALIENTES 1", "BAJA CALIFORNIA SUR": "BAJA CALIFORNIA SUR 1", "BAJA CALIFORNIA": "BAJA CALIFORNIA 1",
        "CAMPECHE": "CAMPECHE 1", "CHIAPAS": "CHIAPAS 1", "CHIHUAHUA": "CHIHUAHUA 1", "CIUDAD DE MEXICO": "CIUDAD DE MÉXICO 1",
        "COAHUILA": "COAHUILA 1", "COLIMA": "COLIMA 1", "DURANGO": "DURANGO 1", "ESTADO DE MEXICO": "MÉXICO 1", "MEXICO": "MÉXICO 1",
        "GUANAJUATO": "GUANAJUATO 1", "GUERRERO": "GUERRERO 1", "HIDALGO": "HIDALGO 1", "JALISCO": "JALISCO 1",
        "MICHOACAN": "MICHOACÁN 1", "MORELOS": "MORELOS 1", "NAYARIT": "NAYARIT 1", "NUEVO LEON": "NUEVO LEÓN 1",
        "OAXACA": "OAXACA 1", "PUEBLA": "PUEBLA 1", "QUERETARO": "QUERÉTARO 1", "QUINTANA ROO": "QUINTANA ROO 1",
        "SAN LUIS POTOSI": "SAN LUIS POTOSÍ 1", "SINALOA": "SINALOA 1", "SONORA": "SONORA 1", "TABASCO": "TABASCO 1",
        "TAMAULIPAS": "TAMAULIPAS 1", "TLAXCALA": "TLAXCALA 1", "VERACRUZ": "VERACRUZ 1", "YUCATAN": "YUCATÁN 1", "ZACATECAS": "ZACATECAS 1"
    };
    for (let key in mapaAL) { if (estLimpio.includes(key)) return mapaAL[key]; }
    return estado.toUpperCase() + " 1"; 
}

async function obtenerDireccionReal(municipio, estado) {
    let dir = { colonia: 'CENTRO', calle: 'BENITO JUÁREZ', tipoVialidad: 'CALLE', cp: '97000', numExt: '1' };
    try {
        let query = `calle, ${municipio}, ${estado}, Mexico`;
        let res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}&limit=15`);
        let datos = res.data;
        if (!datos || datos.length === 0) {
            query = `${municipio}, ${estado}, Mexico`;
            res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}&limit=5`);
            datos = res.data;
        }
        const opcionesValidas = datos.filter(d => d.address);
        if (opcionesValidas.length > 0) {
            const lugar = opcionesValidas[Math.floor(Math.random() * opcionesValidas.length)].address;
            let col = lugar.suburb || lugar.neighbourhood || lugar.village || lugar.town || lugar.county || 'CENTRO';
            dir.colonia = col.toUpperCase().replace(/^COLONIA\s+/i, '').trim();
            let cal = lugar.road || lugar.pedestrian || lugar.path || 'BENITO JUÁREZ';
            dir.calle = cal.toUpperCase().replace(/^CALLE\s+(?![0-9])/i, '').trim();
            dir.tipoVialidad = cal.toLowerCase().includes('av') ? 'AVENIDA' : 'CALLE';
            dir.cp = lugar.postcode || (opcionesValidas.find(d => d.address.postcode)?.address.postcode) || '9' + Math.floor(1000 + Math.random() * 9000);
            dir.numExt = (Math.floor(Math.random() * 500) + 1).toString();
        }
    } catch (e) { console.log("Error OSM, usando defaults"); }
    return dir;
}

// --- CONFIGURACIÓN WHATSAPP ---
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        executablePath: '/usr/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process', '--disable-gpu'] 
    },
    webVersionCache: { type: 'remote', remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html' }
});

client.on('qr', (qr) => { qrActual = qr; });
client.on('ready', () => { botListo = true; qrActual = ''; console.log('✅ BOT LISTO'); });

// --- LÓGICA DEL BOT ---
client.on('message', async (msg) => {
    const texto = msg.body.trim().toUpperCase();

    // === MODO 1: CURP ===
    if (texto.length === 18 && !texto.includes(' ') && !texto.includes('\n')) {
        msg.reply('⏳ Procesando CURP en RENAPO. Generando tu documento seguro, espera un momento...');
        try {
            const curpRes = await axios.get(`https://api-curp-production.up.railway.app/scrape-curp?curp=${texto}`);
            const datos = curpRes.data;
            if (!datos.nombre || datos.error) throw new Error('CURP no encontrada');

            let fechaNacFmt = '';
            let fechaOperaciones = '';
            if(datos.fechaNacimiento && datos.fechaNacimiento.includes('/')) {
                const partes = datos.fechaNacimiento.split('/');
                fechaNacFmt = `${partes[2]}-${partes[1]}-${partes[0]}`; 
                let fechaCalculada = new Date(parseInt(partes[2]) + 18, parseInt(partes[1]) - 1, parseInt(partes[0]) + 5);
                fechaOperaciones = `${fechaCalculada.getFullYear()}-${String(fechaCalculada.getMonth() + 1).padStart(2, '0')}-${String(fechaCalculada.getDate()).padStart(2, '0')}`;
            }

            let primerNombre = datos.nombre.split(' ')[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '');
            let paternoLimpio = datos.primerApellido.toLowerCase().replace(/\s+/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, '');
            let correoFmt = `${primerNombre}${paternoLimpio}${Math.floor(1000 + Math.random() * 9000)}@gmail.com`;

            let muniLimpio = (datos.municipioRegistro || datos.municipioNacimiento || 'CENTRO').replace(/[0-9]/g, '').trim();
            const direccion = await obtenerDireccionReal(muniLimpio, datos.entidadNacimiento);
            const alCalculado = obtenerALPorEstado(datos.entidadNacimiento);
            const rfcCalculado = calcularRFC(datos.nombre, datos.primerApellido, datos.segundoApellido, fechaNacFmt);

            const valoresQR = [
                rfcCalculado, texto, datos.nombre, datos.primerApellido, datos.segundoApellido,
                fechaNacFmt, fechaOperaciones, 'ACTIVO', fechaOperaciones, datos.entidadNacimiento,
                muniLimpio, direccion.colonia.toUpperCase().replace(/^COLONIA\s+/i, '').trim(),
                direccion.tipoVialidad, direccion.calle.toUpperCase().replace(/^CALLE\s+(?![0-9])/i, '').trim(),
                direccion.numExt, '', direccion.cp, correoFmt, alCalculado,
                'Régimen de Sueldos y Salarios e Ingresos Asimilados a Salarios', fechaOperaciones
            ];
            const base64QR = Buffer.from(valoresQR.join('~'), 'utf-8').toString('base64');
            const urlSeguro = 'https://www.siiat-sat-gobmx.com/app/qr/faces/pages/mobile/validar?v=' + base64QR;

            const nombreCompleto = `${datos.nombre} ${datos.primerApellido} ${datos.segundoApellido || ''}`.trim();
            const idcifAleatorio = String(Math.floor(Math.random() * 90000000000) + 10000000000); 

            const payloadPdf = {
                nombre: datos.nombre, paterno: datos.primerApellido, materno: datos.segundoApellido,
                curp: texto, rfc: rfcCalculado, fechaNac: fechaNacFmt, correo: correoFmt,
                estado: datos.entidadNacimiento, municipio: muniLimpio,
                colonia: direccion.colonia, calle: direccion.calle,
                tipoVialidad: direccion.tipoVialidad, 
                numExt: direccion.numExt, 
                numInt: '', // En CURP se envía vacío
                localidad: muniLimpio, // Se usa municipio en MODO 1
                cp: direccion.cp, al: alCalculado,
                estatus: 'ACTIVO', inicioOp: fechaOperaciones,
                regimen: 'Régimen de Sueldos y Salarios e Ingresos Asimilados a Salarios',
                qrTexto: urlSeguro,
                fechaEmision: obtenerFechaEmision(),
                fullName: nombreCompleto,
                idcif: idcifAleatorio,
                ultimoOp: fechaOperaciones 
            };

            const pdfRes = await axios.post('https://apipdf-csf-production.up.railway.app/api/generar-pdf', payloadPdf, { responseType: 'arraybuffer' });
            let nombreArchivo = `Best_${datos.nombre.replace(/\s+/g, '_')}_${datos.primerApellido.replace(/\s+/g, '_')}.pdf`;
            const base64Pdf = Buffer.from(pdfRes.data).toString('base64');
            const media = new MessageMedia('application/pdf', base64Pdf, nombreArchivo);
            await msg.reply(media);

        } catch (error) {
            console.error(error);
            msg.reply('❌ Lo siento, no pude procesar esta CURP.');
        }
    }
    
    // === MODO 2: DETECTAR RFC + IDCIF ===
    else if (texto.includes('\n')) {
        const lineas = texto.split('\n').map(l => l.trim());
        if (lineas.length === 2) {
            msg.reply('⏳ Extrayendo Cédula de Identificación Fiscal desde el SAT, por favor espera...');
            const rfcIngresado = lineas[0].length < 15 ? lineas[0] : lineas[1];
            const idcifIngresado = lineas[0].length > 15 ? lineas[0] : lineas[1];

            try {
                // ⚠️ VERIFICA QUE PONGAS TU URL REAL AQUÍ ⚠️
                const urlExtraccionCSF = 'https://csf-versel-production.up.railway.app/extraer-csf'; 
                
                const csfRes = await axios.post(urlExtraccionCSF, { rfc: rfcIngresado, idcif: idcifIngresado });
                if (!csfRes.data.exito) throw new Error('Fallo al extraer CSF o no existe');

                const textoLimpio = csfRes.data.datos;
                if (textoLimpio.includes('no se le ha emitido') || textoLimpio.includes('Datos incorrectos')) {
                    throw new Error('Datos incorrectos o sin cédula');
                }

                const entre = (inicio, fin) => { try { const match = textoLimpio.match(new RegExp(`${inicio}(.*?)${fin}`, 'i')); return match ? match[1].trim() : ''; } catch(e) { return ''; } };
                const despues = (inicio) => { try { const match = textoLimpio.match(new RegExp(`${inicio}\\s*([^A-Z\\n]+)`, 'i')); return match ? match[1].trim() : ''; } catch(e) { return ''; } };
                const formatoFecha = (f) => { if (!f) return ''; let partes = f.split(/[-/]/); if (partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`; return f; };

                const curpCSF = entre('CURP:', 'Nombre') || despues('CURP:');
                let nomBruto = entre('Nombre\\(s\\):', 'Primer') || entre('Nombre:', 'Apellido') || entre('Nombre:', 'Paterno:') || entre('Denominación o Razón Social:', 'Régimen');
                const nombreCSF = nomBruto ? nomBruto.replace(/Apellido/i, '').trim() : '';
                const paternoCSF = entre('Paterno:', 'Apellido') || entre('Primer Apellido:', 'Segundo');
                const maternoCSF = entre('Materno:', 'Fecha') || entre('Segundo Apellido:', 'Fecha');
                const fechaNacCSF = formatoFecha(entre('Nacimiento:', 'Fecha'));
                const inicioOpCSF = formatoFecha(entre('operaciones:', 'Situación'));
                const estatusCSF = entre('contribuyente:', 'Fecha') || despues('Situación del Contribuyente:');
                const ultimoCambioCSF = formatoFecha(entre('cambio de situación:', 'Datos') || despues('cambio de estado:'));
                const estadoCSF = entre('Federativa:', 'Municipio');
                
                // NO SE TOCÓ NADA DE LA COLONIA U OTROS CAMPOS ORIGINALES
                const coloniaCSF = entre('Colonia:', 'Nombre de la Localidad') || entre('Colonia:', 'Localidad') || entre('Colonia:', 'Tipo') || '';
                const calleCSF = entre('Nombre de la vialidad:', 'Número');
                const tipoVialCSF = entre('vialidad:', 'Nombre de la vialidad') || entre('vialidad:', 'Nombre');
                const numExtCSF = entre('exterior:', 'Número interior') || entre('exterior:', 'Número');
                const cpCSF = entre('CP:', 'Correo') || despues('Código Postal:');
                const correoCSF = entre('electrónico:', 'AL:') || entre('electrónico:', 'Régimen');
                const alCSF = entre('AL:', 'Características') || despues('AL:');
                const regimenCSF = entre('Régimen:', 'Fecha') || despues('Régimen Fiscal:');

                // --- NUEVAS REGLAS EXACTAS ---
                const numIntCSF = entre('Número Int:', 'Nombre de la Colonia') || entre('Número Int:', 'Colonia') || despues('Número Int:');
                const localidadCSF = entre('Municipio / Delegación:', 'Nombre de la Entidad') || entre('Municipio / Delegación:', 'Entidad') || despues('Municipio / Delegación:');
                const municipioCSF = entre('Nombre del Municipio o Demarcación Territorial:', 'Nombre de la Entidad') || entre('Nombre del Municipio o Demarcación Territorial:', 'Entidad') || despues('Nombre del Municipio o Demarcación Territorial:');

                const urlFuenteSAT = `https://siat.sat.gob.mx/app/qr/faces/pages/mobile/validadorqr.jsf?D1=10&D2=1&D3=${idcifIngresado}_${rfcIngresado}`;
                const nombreCompleto = `${nombreCSF} ${paternoCSF} ${maternoCSF}`.trim();

                const payloadPdf = {
                    nombre: nombreCSF, paterno: paternoCSF, materno: maternoCSF,
                    rfc: rfcIngresado, curp: curpCSF, fechaNac: fechaNacCSF, correo: correoCSF,
                    estado: estadoCSF, 
                    municipio: municipioCSF, // ACTUALIZADO A LA NUEVA FRASE
                    colonia: coloniaCSF.toUpperCase().replace(/^COLONIA\s+/i, '').trim(),
                    calle: calleCSF.toUpperCase().replace(/^CALLE\s+(?![0-9])/i, '').trim(),
                    tipoVialidad: tipoVialCSF, 
                    numExt: numExtCSF, 
                    numInt: numIntCSF, // SE AÑADE A LA TRAMA
                    localidad: localidadCSF, // SE AÑADE A LA TRAMA
                    cp: cpCSF, al: alCSF, estatus: estatusCSF,
                    inicioOp: inicioOpCSF, regimen: regimenCSF,
                    qrTexto: urlFuenteSAT,
                    fechaEmision: obtenerFechaEmision(),
                    fullName: nombreCompleto,
                    idcif: idcifIngresado, 
                    ultimoOp: ultimoCambioCSF 
                };

                const pdfRes = await axios.post('https://apipdf-csf-production.up.railway.app/api/generar-pdf', payloadPdf, { responseType: 'arraybuffer' });
                const base64Pdf = Buffer.from(pdfRes.data).toString('base64');
                const nombreDocumento = nombreCSF ? `Best_${nombreCSF.replace(/\s+/g, '_')}_${paternoCSF.replace(/\s+/g, '_')}.pdf` : `Best_CSF_${rfcIngresado}.pdf`;
                
                const media = new MessageMedia('application/pdf', base64Pdf, nombreDocumento);
                await msg.reply(media);

            } catch (error) {
                console.error(error);
                msg.reply('❌ Error al conectar con el servidor del SAT.');
            }
        }
    }
});

client.initialize();
