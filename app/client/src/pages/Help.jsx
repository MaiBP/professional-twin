import { COMMANDS } from '../commands.js';
import { Copy } from '../components/Command.jsx';
import Icon from '../components/Icon.jsx';
import { L } from '../i18n.js';

const SECTIONS = [
  {
    icon: 'home', title: L('Home', 'Inicio'), link: '#/home',
    text: L('Your overview: projects in progress, what is waiting for your answer and your latest achievements. Ask your twin “where are we?” when you come back after a few days.', 'Tu resumen: proyectos en marcha, lo que espera tu respuesta y tus últimos logros. Pregúntale al gemelo «¿en qué estamos?» cuando vuelvas después de unos días.'),
  },
  {
    icon: 'profile', title: L('Profile', 'Perfil'), link: '#/profile',
    text: L('Who you are, how you work and where you want to go. Upload your CV and your twin fills it in for you with a short interview. You can also ask for a mentoring session here.', 'Quién eres, cómo trabajas y hacia dónde quieres ir. Sube tu CV y el gemelo lo completa por ti con una entrevista breve. Desde aquí también puedes pedir una sesión de mentoría.'),
  },
  {
    icon: 'company', title: L('Company', 'Empresa'), link: '#/company',
    text: L('The context of your work: the business, the key people and the tools you can use. This way your twin suggests realistic solutions.', 'El contexto de tu trabajo: el negocio, las personas clave y las herramientas que puedes usar. Así el gemelo propone soluciones realistas.'),
  },
  {
    icon: 'projects', title: L('Projects', 'Proyectos'), link: '#/projects',
    text: L('Each need at work becomes a project that moves through phases, from understanding it to the result. You can also document projects you already did to build your portfolio.', 'Cada necesidad de tu trabajo es un proyecto que avanza por fases, desde entenderla hasta el resultado. También puedes documentar proyectos que ya hiciste para tener tu portafolio.'),
  },
  {
    icon: 'journal', title: L('Logbook', 'Bitácora'), link: '#/journal',
    text: L('Everything you achieve, with evidence and written up for your CV. It fills up by itself as you work with your twin, and you can also tell it about things you did on your own.', 'Todo lo que logras, con evidencia y redactado para tu CV. Se llena sola al trabajar con el gemelo, y también puedes contarle cosas que hiciste por tu cuenta.'),
  },
  {
    icon: 'cv', title: 'CV', link: '#/cv',
    text: L('Your CVs, created from your real achievements and aimed at the role you want, ready as PDF.', 'Tus currículums, creados a partir de tus logros reales y orientados al puesto que busques, listos en PDF.'),
  },
  {
    icon: 'offers', title: L('Job offers', 'Ofertas'), link: '#/offers',
    text: L('Paste a job offer and your twin tells you how well you fit, what you are missing and how to tailor your application. It also prepares the CV, cover letter and interview for that offer.', 'Pega una oferta de empleo y el gemelo te dice cuánto encajas, qué te falta y cómo ajustar tu candidatura. También prepara el CV, la carta y la entrevista para esa oferta.'),
  },
  {
    icon: 'gear', title: L('Settings', 'Configuración'), link: '#/settings',
    text: L('Connect your Claude account so your twin can work, choose the language and theme, make backups, create the desktop shortcut and close the app when you are not using it.', 'Conecta tu cuenta de Claude para que el gemelo pueda trabajar, elige el idioma y el tema, haz copias de seguridad, crea el acceso directo del escritorio y cierra la app cuando no la uses.'),
  },
];

const FAQ = [
  [
    L('How do I ask my twin for something?', '¿Cómo le pido algo al gemelo?'),
    L('Each section has a “Your twin” panel with buttons for the most common tasks (analyze, document, continue the project…) and a box to write to it in your own words. No special format needed: write to it as you would to a colleague.', 'En cada sección hay un panel «Tu gemelo» con botones para lo más habitual (analizar, documentar, seguir con el proyecto…) y una caja para escribirle con tus palabras. No hace falta ningún formato especial: escríbele como a un compañero.'),
  ],
  [
    L('Why does it take a few minutes?', '¿Por qué tarda unos minutos?'),
    L('Because it reads your documents, your profile and your logbook before answering, and writes complete documents. While it works you see every step it takes. You can keep using the app or close it: the result is saved anyway.', 'Porque lee tus documentos, tu perfil y tu bitácora antes de responder, y escribe los documentos completos. Mientras trabaja ves cada paso que da. Puedes seguir usando la app o cerrarla: el resultado se guarda igual.'),
  ],
  [
    L('My twin asked me questions. What do I do?', 'El gemelo me hizo preguntas, ¿qué hago?'),
    L('Answer in the same chat. Each question comes with a suggested answer: if it works for you, just write “ok” or “all good”. If you don’t know something, say so: it will mark it as pending and carry on.', 'Respóndele en el mismo chat. Cada pregunta trae una respuesta sugerida: si te vale, basta con escribir «ok» o «todas bien». Si no sabes algo, díselo: lo marcará como pendiente y seguirá.'),
  ],
  [
    L('Can I change what it wrote?', '¿Puedo cambiar lo que escribió?'),
    L('Yes. In any document press “Edit” and you will see a form with its fields. Save, and your twin will take your changes into account next time.', 'Sí. En cualquier documento pulsa «Editar» y verás un formulario con sus campos. Guarda y el gemelo tendrá en cuenta tus cambios la próxima vez.'),
  ],
  [
    L('Does it make things up?', '¿Inventa información?'),
    L('No. Your twin never invents achievements, figures or qualifications. What it doesn’t know it marks with ❓ and asks you. What it assumes it marks as an assumption until you confirm it.', 'No. El gemelo nunca inventa logros, cifras ni títulos. Lo que no sabe lo marca con ❓ y te lo pregunta. Lo que supone lo marca como supuesto hasta que lo confirmes.'),
  ],
  [
    L('Where is my information stored?', '¿Dónde se guarda mi información?'),
    L('Your files, documents and conversations are stored only on this PC, in your twin’s folder. To read and write, your twin uses Claude (by Anthropic): what it analyzes in each task is sent securely to Claude for processing, just like when you use Claude directly. Before uploading company material, remove any personal data about customers or employees that isn’t needed.', 'Tus archivos, documentos y conversaciones se guardan solo en este PC, en la carpeta del gemelo. Para leer y redactar, el gemelo usa Claude (de Anthropic): lo que analiza en cada tarea se envía de forma segura a Claude para procesarlo, igual que cuando usas Claude directamente. Antes de subir material de la empresa, quita los datos personales de clientes o empleados que no hagan falta.'),
  ],
  [
    L('Which Claude account do I use?', '¿Qué cuenta de Claude uso?'),
    L('Your own: the usage of each task is counted against that account. If the account you connected belongs to your company, keep in mind that your CV, your job offers and your projects are processed with it; to keep personal things separate, connect your own account in Settings.', 'La tuya: el consumo de cada tarea se descuenta de esa cuenta. Si la que tienes conectada es de tu empresa, ten en cuenta que tu CV, tus ofertas y tus proyectos se procesan con ella; para separar lo personal, conecta una cuenta propia en Configuración.'),
  ],
  [
    L('How do I make a backup?', '¿Cómo hago una copia de seguridad?'),
    L('In Settings → Backups press “Download backup”: you get a single .zip file with all your information. Keep it somewhere private. If you lose your data or change PC, use “Restore from a backup” and choose that file. Inside the .zip there is a README with instructions.', 'En Configuración → Copias de seguridad pulsa «Descargar copia»: obtienes un único archivo .zip con toda tu información. Guárdalo en un lugar privado. Si pierdes los datos o cambias de PC, usa «Restaurar desde una copia» y elige ese archivo. Dentro del .zip hay un README con las instrucciones.'),
  ],
  [
    L('What if I delete something by mistake?', '¿Y si borro algo por error?'),
    L('When you delete a project or a job offer, the app asks you to confirm and keeps a copy in your twin’s recycle bin on your PC. Ask your twin “restore the project I deleted” and it will bring it back.', 'Al borrar un proyecto o una oferta, la app te pide confirmación y guarda una copia en la papelera del gemelo, en tu PC. Pídele al gemelo «recupera el proyecto que borré» y lo restaurará.'),
  ],
  [
    L('My twin says it couldn’t finish', 'El gemelo dice que no pudo terminar'),
    L('Try again in a moment. If it keeps happening, check in Settings that your Claude account is still connected.', 'Vuelve a intentarlo en un momento. Si se repite, mira en Configuración que tu cuenta de Claude siga conectada.'),
  ],
];

export default function Help() {
  return (
    <>
      <header className="page-header">
        <h1>{L('Help', 'Ayuda')}</h1>
        <p className="muted">{L('How your Professional Twin works, in two minutes.', 'Cómo funciona tu gemelo profesional, en dos minutos.')}</p>
      </header>

      <section className="card highlight help-intro">
        <h2>{L('What is your twin?', '¿Qué es el gemelo?')}</h2>
        <p>{L('It is an assistant that knows you: your experience, how you work and where you want to go. It does three things for you:', 'Es un asistente que te conoce: sabe tu experiencia, cómo trabajas y hacia dónde quieres ir. Hace tres cosas por ti:')}</p>
        <div className="grid help-roles">
          <div><strong>🤝 {L('Coworker', 'Compañero de trabajo')}</strong><p className="muted">{L('Analyzes, plans, documents and builds solutions for the needs of your job.', 'Analiza, planifica, documenta y construye soluciones para las necesidades de tu trabajo.')}</p></div>
          <div><strong>🧭 {L('Mentor', 'Mentor')}</strong><p className="muted">{L('Challenges you with good judgement, warns you about risks and suggests how to grow towards the role you want.', 'Te cuestiona con criterio, te avisa de riesgos y te propone cómo crecer hacia el rol que buscas.')}</p></div>
          <div><strong>📌 {L('Career chronicler', 'Cronista de tu carrera')}</strong><p className="muted">{L('Records everything you achieve so that your CV and portfolio build themselves, with proof.', 'Anota todo lo que logras para que tu CV y tu portafolio se construyan solos, con pruebas.')}</p></div>
        </div>
      </section>

      <section className="block">
        <h2>{L('First steps', 'Primeros pasos')}</h2>
        <ol className="help-steps">
          <li><strong>{L('Connect your AI', 'Conecta tu IA')}</strong> {L('in', 'en')} <a href="#/settings">{L('Settings', 'Configuración')}</a>: {L('sign in with your Claude account. There you can also create a desktop shortcut to open the app with a double click.', 'inicia sesión con tu cuenta de Claude. Ahí también puedes crear un acceso directo en el escritorio para abrir la app con doble clic.')}</li>
          <li><strong>{L('Upload your CV', 'Sube tu CV')}</strong> {L('in', 'en')} <a href="#/profile/sources">{L('Profile → CV and certificates', 'Perfil → CV y certificados')}</a> {L('and press “Complete or update my profile”. Your twin reads it and asks you a few questions.', 'y pulsa «Completar o actualizar mi perfil». El gemelo lo lee y te hace unas preguntas.')}</li>
          <li><strong>{L('Tell it about a project.', 'Cuéntale un proyecto.')}</strong> {L('In', 'En')} <a href="#/projects">{L('Projects', 'Proyectos')}</a> {L('you can describe a new need or document something you already did by pointing to the folder where its documentation is.', 'puedes contar una necesidad nueva o documentar algo que ya hiciste indicando la carpeta donde está su documentación.')}</li>
          <li><strong>{L('Answer and approve.', 'Responde y aprueba.')}</strong> {L('Your twin moves step by step and asks for your approval before closing each phase. In each project you will see its map: what it does, how it works and its journey.', 'El gemelo avanza paso a paso y te pide tu aprobación antes de cerrar cada fase. En cada proyecto verás su mapa: qué hace, cómo funciona y su recorrido.')}</li>
          <li><strong>{L('Use what you build.', 'Usa lo que construyes.')}</strong> {L('Your achievements are logged automatically in the', 'Tus logros se anotan solos en la')} <a href="#/journal">{L('Logbook', 'Bitácora')}</a> {L('and from there come your', 'y desde ahí salen tus')} <a href="#/cv">CV</a> {L('and your applications in', 'y tus candidaturas en')} <a href="#/offers">{L('Job offers', 'Ofertas')}</a>.</li>
        </ol>
      </section>

      <section className="block">
        <h2>{L('The sections', 'Las secciones')}</h2>
        <div className="grid">
          {SECTIONS.map((s) => (
            <a key={s.link} className="card project" href={s.link}>
              <div className="row"><Icon name={s.icon} /><strong>{s.title}</strong></div>
              <p className="muted">{s.text}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="block">
        <h2>{L('A project’s map', 'El mapa de un proyecto')}</h2>
        {L(
          <p>Each project has a <strong>map</strong> with three parts: the <strong>summary card</strong> (problem, who it is for, solution, impact), the <strong>diagram</strong> of how it works and the <strong>journey</strong> with its phases, decisions and achievements. In the diagram, each piece has an icon for what it is (person, system, data, file, process, AI, external company), and the dots moving along the arrows show where the information travels. Click a piece to see its details. With the <strong>Download PDF</strong> button you get the summary card and the diagram in a document ready to share or print.</p>,
          <p>Cada proyecto tiene un <strong>mapa</strong> con tres partes: la <strong>ficha</strong> (problema, para quién, solución, impacto), el <strong>diagrama</strong> de cómo funciona y el <strong>recorrido</strong> con las fases, decisiones y logros. En el diagrama, cada pieza tiene un icono según lo que es (persona, sistema, datos, archivo, proceso, IA, empresa externa), y los puntos que se mueven por las flechas muestran por dónde viaja la información. Haz clic en una pieza para ver su detalle. Con el botón <strong>Descargar PDF</strong> te llevas la ficha y el diagrama en un documento listo para compartir o imprimir.</p>,
        )}
      </section>

      <section className="block">
        <h2>{L('Frequently asked questions', 'Preguntas frecuentes')}</h2>
        <div className="faq">
          {FAQ.map(([q, a]) => (
            <details key={q} className="card">
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <details className="card block advanced">
        <summary>{L('For advanced users: using your twin from Claude Code', 'Para usuarios avanzados: usar el gemelo desde Claude Code')}</summary>
        <p className="muted">{L('Everything the app does can also be requested in the Claude Code chat, with your twin’s folder open (for example in VS Code). These are the shortcuts:', 'Todo lo que hace la app también se puede pedir en el chat de Claude Code, con la carpeta del gemelo abierta (por ejemplo en VS Code). Estos son los atajos:')}</p>
        <div className="grid">
          {COMMANDS.map((c) => (
            <article key={c.command} className="card">
              <div className="row between">
                <code className="command-name">{c.command}</code>
                <Copy text={c.command} />
              </div>
              <h3>{c.title}</h3>
              <p>{c.purpose}</p>
              <p className="muted">{L('Example', 'Ejemplo')}: <code>{c.example}</code></p>
            </article>
          ))}
        </div>
      </details>
    </>
  );
}
