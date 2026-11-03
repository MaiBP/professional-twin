// Registry of the app sections. To add a new section:
// 1. create its page in ./pages/
// 2. add it here (it appears by itself in the menu and at the route #/<id>)
import { L } from './i18n.js';
import Home from './pages/Home.jsx';
import Profile from './pages/Profile.jsx';
import Company from './pages/Company.jsx';
import Projects from './pages/Projects.jsx';
import Journal from './pages/Journal.jsx';
import CV from './pages/CV.jsx';
import Offers from './pages/Offers.jsx';
import Help from './pages/Help.jsx';
import Settings from './pages/Settings.jsx';

export const SECTIONS = [
  { id: 'home', title: L('Home', 'Inicio'), icon: 'home', Page: Home },
  { id: 'profile', title: L('Profile', 'Perfil'), icon: 'profile', Page: Profile },
  { id: 'company', title: L('Company', 'Empresa'), icon: 'company', Page: Company },
  { id: 'projects', title: L('Projects', 'Proyectos'), icon: 'projects', Page: Projects },
  { id: 'journal', title: L('Logbook', 'Bitácora'), icon: 'journal', Page: Journal },
  { id: 'cv', title: 'CV', icon: 'cv', Page: CV },
  { id: 'offers', title: L('Job offers', 'Ofertas'), icon: 'offers', Page: Offers },
  { id: 'settings', title: L('Settings', 'Configuración'), icon: 'gear', Page: Settings },
  { id: 'help', title: L('Help', 'Ayuda'), icon: 'help', Page: Help },
];
