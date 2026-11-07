import { render } from 'preact';
import { Root } from '@ui/Root';
import { registerOffline } from './offline';
import './ui/styles/app.css';

render(<Root />, document.getElementById('app')!);
registerOffline();
