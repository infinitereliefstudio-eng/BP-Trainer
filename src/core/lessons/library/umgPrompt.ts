/**
 * V7.37, UMG at Confirmé: « Appuie sur E ». The project of « Interagir comme
 * dans UE5 » (R4), solved: the player receives IA_Interagir and sends
 * Interagir to the object in reach. Now an invite says when there is one:
 * BP_Joueur announces it (an Event Dispatcher with a Boolean), WBP_Invite
 * subscribes in Event Construct and shows its Text, or collapses it.
 */
import { T } from '../../types/pins';
import { edit } from '../builder';
import { noRuntimeErrors, notion } from '../checks';
import type { Check, CheckContext, Lesson } from '../types';
import { goTo, tap } from './kit';
import { refactor4 } from './interactUe5';
import { UMG_MODULE } from './umgCounter';
import { dispatcherWith, showAtStart } from './umgHealth';
import { addW, centred, drawnProp, eventDriven, getW, newClass } from './umgKit';

const LAMP: [number, number] = [-450, -250];
const CHEST: [number, number] = [-450, 300];
const INVITE = 'Appuie sur E';

const shownNow = (cx: CheckContext) => drawnProp(cx, 'Txt_Invite')?.drawn === true;
const lampOn = (cx: CheckContext) => cx.component('BP_Lampe', 'Lumiere')?.props.visible === true;
const chestOpen = (cx: CheckContext) => cx.component('BP_Coffre', 'Couvercle')?.props.visible === false;

function invite(id: string, expected: boolean, label: string, at: string, where: string): Check {
  return {
    id,
    label,
    at,
    test: (cx) => {
      if (shownNow(cx) === expected) return true;
      if (drawnProp(cx, 'Txt_Invite') === undefined) return 'WBP_Invite n’est plus à l’écran, ou Txt_Invite a été renommé.';
      return expected
        ? `${where}, l’invite reste cachée : BP_Joueur doit annoncer qu’un objet interactif est à portée, et WBP_Invite passer Txt_Invite en Visible.`
        : `${where}, l’invite est encore affichée : en sortant de la zone (Event ActorEndOverlap), il faut l’annoncer aussi, et la cacher (Collapsed).`;
    },
  };
}

export const lessonPressE: Lesson = {
  id: 'l-appuie-sur-e',
  module: UMG_MODULE,
  level: 'confirme',
  number: 0,
  title: 'Appuie sur E',
  situation:
    'L’interaction marche comme dans UE5 : le joueur reçoit E et prévient l’objet à portée. Mais rien ne dit au joueur qu’il peut agir. Affiche « Appuie sur E » quand un objet interactif est à portée, et cache-le dès qu’il s’éloigne.',
  recalls: ['dispatchers', 'cast', 'overlap', 'interfaces'],
  notions: ['Collapsed', 'Set Visibility', 'Does Implement Interface', 'Event Dispatcher'],
  remember:
    'Le joueur sait ce qui est à portée (ses overlaps) et l’annonce ; l’invite s’y abonne et se montre ou se cache. Pour cacher un widget, Collapsed est l’usage : il ne prend plus de place (Hidden la garde). Does Implement Interface dit si l’objet touché sait répondre à Interagir.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'La solution d’« Interagir comme dans UE5 » : **BPI_Interactif** (fonction Interagir), implémentée par **BP_Lampe**, **BP_Porte**, **BP_Generateur** et **BP_Coffre**, chacun avec une Zone. **BP_Joueur** reçoit **IA_Interagir** et envoie Interagir aux acteurs qui le chevauchent.\n\n' +
        '**WBP_Invite** : **Txt_Invite** (« Appuie sur E »), coché Is Variable et réglé sur **Collapsed** dans le Designer, en bas de l’écran. BP_PlayerController l’ajoute à l’écran au lancement. Son Graph est vide.',
    },
    {
      title: 'Ce qui est nouveau : montrer, cacher',
      body:
        '**Set Visibility** sur un widget prend une valeur d’**ESlateVisibility** :\n\n' +
        '- **Visible** : dessiné, et il reçoit les touchers ;\n- **Collapsed** : caché, il ne prend plus de place (le reste se resserre dans une boîte) ;\n- **Hidden** : caché, mais sa place reste vide.\n\n' +
        'Pour une invite, Collapsed est l’usage courant.\n\n' +
        '**Does Implement Interface** (BPI_Interactif) dit si un acteur sait répondre à Interagir : le joueur ne doit pas proposer E devant un mur ou une caisse.',
    },
    {
      title: 'Le cahier des charges',
      body:
        '- **BP_Joueur** annonce, par un Event Dispatcher `OnPortee` avec un Boolean `APortee`, quand un objet interactif entre dans sa portée (vrai) et quand il en sort (faux) : Event **ActorBeginOverlap** et **ActorEndOverlap**, Other Actor testé avec Does Implement Interface.\n' +
        '- **WBP_Invite**, dans Event Construct, s’abonne à OnPortee (même méthode que « La barre de vie ») : vrai → Txt_Invite **Visible**, faux → **Collapsed**.\n' +
        '- E fait toujours son travail : la lampe s’allume, le coffre s’ouvre.',
    },
  ],
  objectives: [
    'L’invite est cachée au lancement, loin de tout.',
    'Près de la lampe ou du coffre, « Appuie sur E » s’affiche ; en s’éloignant, elle disparaît.',
    'E actionne toujours l’objet.',
  ],
  hints: [
    'Qui sait qu’un objet est à portée ? Le joueur, par ses overlaps. Il lui faut une façon de le dire, et à l’invite une façon de l’entendre, comme pour la barre de vie.',
    'Event Dispatcher (Boolean), Event ActorBeginOverlap, Event ActorEndOverlap, Does Implement Interface, Branch, Call ; Event Construct, Get Owning Player Pawn, Cast To BP_Joueur, Bind Event, Custom Event, Set Visibility.',
    'Solution : BP_Joueur : Event Dispatcher OnPortee (APortee, Boolean). ActorBeginOverlap → Branch (Does Implement Interface BPI_Interactif, Test Object = Other Actor) → Call OnPortee (coché). ActorEndOverlap → la même chose, décoché. WBP_Invite : Event Construct → Cast To BP_Joueur (Get Owning Player Pawn) → Bind Event to OnPortee (Afficher). Afficher (APortee) → Branch : True → Set Visibility (Txt_Invite, Visible), False → Set Visibility (Txt_Invite, Collapsed).',
  ],
  challenge: 'Fais dire à l’invite ce que fait l’objet : « E : allumer », « E : ouvrir ». Qui connaît ce texte : le joueur, l’invite, ou l’objet ? Une fonction d’interface de plus, qui rend un Text, est une piste.',
  setup() {
    const p = refactor4.setup();
    refactor4.solve(p);
    p.name = 'Appuie sur E';
    const w = newClass(p, 'WBP_Invite', 'UserWidget');
    const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
    addW(p, w.cls, 'TextBlock', canvas.id, {
      name: 'Txt_Invite',
      isVariable: true,
      props: { text: INVITE, fontSize: 28, justification: 'Center', visibility: 1 },
      slot: { ...centred(0, 0, 420, 48), anchors: { minX: 0.5, minY: 1, maxX: 0.5, maxY: 1 }, offsets: [0, -90, 420, 48] },
    });
    showAtStart(p, w);
    return p;
  },
  scenario: [
    { wait: 0.3 },
    { checkpoint: 'debut' },
    ...goTo(...LAMP),
    { checkpoint: 'lampe' },
    ...tap('E'),
    ...goTo(0, 0),
    { checkpoint: 'loin' },
    ...goTo(...CHEST),
    { checkpoint: 'coffre' },
    ...tap('E'),
    { wait: 0.1 },
  ],
  checks: [
    invite('hidden', false, 'Au lancement, loin de tout : pas d’invite', 'debut', 'Au lancement, loin de tout'),
    invite('lamp', true, 'Près de la lampe : « Appuie sur E »', 'lampe', 'Près de la lampe'),
    invite('away', false, 'En s’éloignant : elle disparaît', 'loin', 'Loin de tout'),
    invite('chest', true, 'Près du coffre : elle revient', 'coffre', 'Près du coffre'),
    {
      id: 'still-works',
      label: 'E actionne toujours la lampe et le coffre',
      test: (cx) => (!lampOn(cx) ? 'E près de la lampe ne l’allume plus.' : !chestOpen(cx) ? 'E près du coffre ne l’ouvre plus.' : true),
    },
    notion({
      id: 'collapsed',
      label: 'L’invite se cache avec Collapsed',
      test: (cx) =>
        cx.nodes('WBP_Invite').some((n) => n.def === 'widget.setVisibility' && n.defaults.visibility === 1)
          ? true
          : 'Pour cacher l’invite, Set Visibility sur Collapsed : il ne prend plus de place (Hidden garde la sienne).',
    }),
    notion({ id: 'event-driven', label: 'L’invite suit l’annonce du joueur, sans Binding ni Tick', test: (cx) => eventDriven(cx, 'WBP_Invite') }),
    noRuntimeErrors(),
  ],
  solve(p) {
    const player = edit(p, 'BP_Joueur');
    const d = dispatcherWith(player, 'OnPortee', 'APortee', T.bool);
    const iface = p.interfaces.find((i) => i.name === 'BPI_Interactif')!.id;
    const announce = (event: string, value: boolean, y: number) => {
      const ev = player.node(event, {}, {}, [64, y]);
      const test = player.node('iface.doesImplement', { interface: iface }, {}, [300, y + 200]);
      const branch = player.node('flow.branch', {}, {}, [560, y]);
      const call = player.node('dispatcher.call', { owner: player.cls.id, dispatcher: d.id }, { [d.param]: value }, [860, y]);
      player.link(ev, 'then', branch, 'exec').link(ev, 'other', test, 'object').link(test, 'result', branch, 'condition').link(branch, 'true', call, 'exec');
    };
    announce('event.actorBeginOverlap', true, 400);
    announce('event.actorEndOverlap', false, 760);

    const w = edit(p, 'WBP_Invite');
    const construct = w.node('event.construct', {}, {}, [64, 96]);
    const cast = w.node('cast.to', { class: player.cls.id }, {}, [360, 96]);
    const bind = w.node('dispatcher.bind', { owner: player.cls.id, dispatcher: d.id }, {}, [700, 96]);
    const ev = w.node('event.custom', { name: 'Afficher', signature: d.id, signatureOwner: player.cls.id }, {}, [64, 400]);
    w.link(construct, 'then', cast, 'exec').link(w.node('widget.getOwningPlayerPawn', {}, {}, [64, 260]), 'result', cast, 'object');
    w.link(cast, 'then', bind, 'exec').link(cast, 'as', bind, 'target').link(ev, 'delegate', bind, 'event');
    const branch = w.node('flow.branch', {}, {}, [400, 400]);
    const show = w.node('widget.setVisibility', {}, { visibility: 0 }, [720, 340]);
    const hide = w.node('widget.setVisibility', {}, { visibility: 1 }, [720, 560]);
    w.link(ev, 'then', branch, 'exec').link(ev, d.param, branch, 'condition');
    w.link(branch, 'true', show, 'exec').link(getW(w, 'Txt_Invite', [560, 460]), 'value', show, 'target');
    w.link(branch, 'false', hide, 'exec').link(getW(w, 'Txt_Invite', [560, 680]), 'value', hide, 'target');
  },
};

