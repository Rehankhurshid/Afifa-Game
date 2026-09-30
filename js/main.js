'use strict';
/* Bootstrap: register scenes and start on the splash screen. */

Game.register('splash', SplashScene);
Game.register('menu', MenuScene);
Game.register('settings', SettingsScene);
Game.register('instructions', InstructionsScene);
Game.register('characters', CharactersScene);
Game.register('exit', ExitScene);
Game.register('cinematic', CinematicScene);
Game.register('levelselect', LevelSelectScene);
Game.register('levelintro', LevelIntroScene);
Game.register('battle', BattleScene);
Game.register('result', ResultScene);
Game.register('comingsoon', ComingSoonScene);

Game.init();
Game.go('splash', {}, true);
