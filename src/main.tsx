import { render } from 'preact';
import { Root } from '@ui/Root';
import { applyUiSettings } from '@ui/uiSettings';
import { registerOffline } from './offline';
import './ui/styles/tokens.css';
import './ui/styles/app.css';
import './ui/styles/panels.css';
import './ui/styles/components.css';

applyUiSettings();
render(<Root />, document.getElementById('app')!);
registerOffline();
