import { L } from './i18n.js';

// Twin commands (skills in .claude/skills/). When you create a new one, add it here.
export const COMMANDS = [
  {
    command: '/onboarding',
    title: L('Load your profile', 'Cargar tu perfil'),
    purpose: L('Build or update your profile from your CV, certificates and company context.', 'Construir o actualizar tu perfil a partir de tu CV, certificados y contexto de empresa.'),
    example: '/onboarding',
  },
  {
    command: '/need',
    title: L('Describe a need', 'Contar una necesidad'),
    purpose: L('Describe a problem or opportunity at work and open a project.', 'Describir un problema u oportunidad de tu trabajo y abrir un proyecto.'),
    example: L('/need every manager reads the call-centre metrics their own way', '/need cada manager interpreta las métricas de telefonía a su manera'),
  },
  {
    command: '/document',
    title: L('Document a finished project', 'Documentar un proyecto ya hecho'),
    purpose: L('Add work you already finished, with its material, map and achievements, to your portfolio.', 'Dar de alta un trabajo terminado, con su material, su mapa y sus logros, para tu portafolio.'),
    example: L('/document the Word add-in for bulk email sending (2023)', '/document el add-in de Word para envío masivo de correos (2023)'),
  },
  {
    command: '/advance',
    title: L('Move a project forward', 'Avanzar un proyecto'),
    purpose: L('Answer questions, approve a phase or go to the next step.', 'Responder preguntas, aprobar una fase o pasar al siguiente paso.'),
    example: L('/advance approved, let\'s continue', '/advance aprobado, sigamos'),
  },
  {
    command: '/log',
    title: L('Log an achievement', 'Registrar un logro'),
    purpose: L('Note something you did outside a project: a task, a course, a recognition.', 'Anotar algo que hiciste fuera de un proyecto: tarea, curso, reconocimiento.'),
    example: L('/log I finished the advanced Power BI course', '/log terminé el curso de Power BI avanzado'),
  },
  {
    command: '/mentor',
    title: L('Mentoring session', 'Sesión de mentoría'),
    purpose: L('Review your progress towards your target role, your gaps and your development plan.', 'Revisar tu progreso frente al rol objetivo, tus brechas y tu plan de desarrollo.'),
    example: '/mentor',
  },
  {
    command: '/cv',
    title: L('Create a CV', 'Generar CV'),
    purpose: L('Create a CV aimed at a role or job offer, based on your logbook.', 'Crear un CV orientado a un puesto u oferta a partir de tu bitácora.'),
    example: '/cv Analytics Manager',
  },
  {
    command: '/offer',
    title: L('Analyse a job offer', 'Analizar una oferta'),
    purpose: L('See whether an offer fits your profile, what you are missing and how to tailor your CV, cover letter and interview.', 'Ver si una oferta encaja con tu perfil, qué te falta y cómo ajustar tu CV, carta y entrevista.'),
    example: L('/offer (and paste the offer text)', '/offer (y pega el texto de la oferta)'),
  },
  {
    command: '/status',
    title: L('See status', 'Ver estado'),
    purpose: L('Summary of projects, pending items and recent achievements.', 'Resumen de proyectos, pendientes y logros recientes.'),
    example: '/status',
  },
];
