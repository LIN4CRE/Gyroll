/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { SceneManager } from './game/sceneManager';
import { TRACKS } from './game/tracks';
import { BALL_SKINS, BALL_TRAILS, loadUserProgress, recordTrackCompletion, saveUserProgress } from './game/customization';
import { inputManager } from './game/input';
import { sound } from './game/audio';
import { BallSkin, BallTrail, TrackDefinition, UserProgress } from './game/types';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { LevelSelectModal } from './components/LevelSelectModal';
import { CustomizationModal } from './components/CustomizationModal';
import { SettingsModal } from './components/SettingsModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { PauseModal } from './components/PauseModal';
import { VictoryModal } from './components/VictoryModal';
import { calculateStars } from './game/physics';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);

  // App State
  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'gameover'>('title');
  const [activeModal, setActiveModal] = useState<'none' | 'level_select' | 'customization' | 'settings' | 'how_to_play'>('none');

  // Progression & Selection
  const [progress, setProgress] = useState<UserProgress>(loadUserProgress);
  const [selectedTrack, setSelectedTrack] = useState<TrackDefinition>(TRACKS[0]);

  // Live HUD State
  const [hudStats, setHudStats] = useState({
    speed: 0,
    time: 0,
    falls: 0,
    currentCheckpoint: 0,
    totalCheckpoints: 0,
    isRecovering: false,
  });

  // Sensor state for indicators and bubble level
  const [sensorState, setSensorState] = useState(inputManager.getSensorState());

  // Victory Run snapshot
  const [victoryData, setVictoryData] = useState<{
    time: number;
    falls: number;
    stars: number;
    earnedCoins: number;
    isNewBest: boolean;
  } | null>(null);

  // Initialize Input Manager & Three.js Scene
  useEffect(() => {
    // Mount global input reference for high-speed simulation loop
    (window as any).__gyroRollInput = inputManager;
    inputManager.init();
    inputManager.setConfiguration({
      sensitivity: progress.settings.sensitivity,
      deadzone: progress.settings.deadzone,
      invert: progress.settings.invertSteering,
      controlMode: progress.settings.controlMode,
      neutralGamma: progress.settings.neutralGamma,
      neutralBeta: progress.settings.neutralBeta,
    });

    if (!canvasContainerRef.current) return;

    const currentSkin = BALL_SKINS.find((s) => s.id === progress.selectedSkinId) || BALL_SKINS[0];
    const currentTrail = BALL_TRAILS.find((t) => t.id === progress.selectedTrailId) || BALL_TRAILS[0];

    const manager = new SceneManager(
      canvasContainerRef.current,
      selectedTrack,
      currentSkin,
      currentTrail,
      {
        onCheckpoint: (index, name) => {
          // Checkpoint reached
        },
        onFinish: (clearTime, falls) => {
          const starRes = calculateStars(clearTime, falls, selectedTrack.targetTimes);
          const completion = recordTrackCompletion(
            progress,
            selectedTrack.id,
            clearTime,
            starRes.stars,
            falls,
            selectedTrack.rewardCoins
          );

          const prevRecord = progress.trackRecords[selectedTrack.id];
          const isNewBest = !prevRecord?.bestTime || clearTime < prevRecord.bestTime;

          setProgress(completion.progress);
          setVictoryData({
            time: clearTime,
            falls,
            stars: starRes.stars,
            earnedCoins: completion.earnedCoins,
            isNewBest,
          });
          setGameState('gameover');
          document.body.dataset.state = 'gameover';
        },
        onFall: (falls) => {
          // Handled in hud stats
        },
        onHudUpdate: (stats) => {
          setHudStats(stats);
        },
      }
    );

    sceneManagerRef.current = manager;

    // Check for ?autostart=1 query param
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      manager.setMode('playing');
      setGameState('playing');
      document.body.dataset.state = 'playing';
    } else {
      manager.setMode('title');
      document.body.dataset.state = 'title';
    }

    // Sensor poll interval for HUD display
    const sensorInterval = setInterval(() => {
      setSensorState(inputManager.getSensorState());
    }, 100);

    return () => {
      clearInterval(sensorInterval);
      manager.dispose();
      inputManager.destroy();
    };
  }, []);

  // Sync settings when progress updates
  useEffect(() => {
    inputManager.setConfiguration({
      sensitivity: progress.settings.sensitivity,
      deadzone: progress.settings.deadzone,
      invert: progress.settings.invertSteering,
      controlMode: progress.settings.controlMode,
      neutralGamma: progress.settings.neutralGamma,
      neutralBeta: progress.settings.neutralBeta,
    });
    sound.setVolumes(
      progress.settings.sfxVolume,
      progress.settings.sfxVolume,
      progress.settings.engineVolume,
      progress.settings.isMuted
    );
  }, [progress.settings]);

  // Global Keyboard shortcuts (Escape, M, R, Enter/Space for start)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        if (activeModal === 'none') {
          handleStartGame();
        }
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameState === 'playing') {
          handlePause();
        } else if (gameState === 'paused') {
          handleResume();
        }
      } else if (e.code === 'KeyM') {
        handleToggleMute();
      } else if (e.code === 'KeyR' && gameState === 'playing') {
        handleRestart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, activeModal, progress, selectedTrack]);

  // Actions
  const handleStartGame = () => {
    sound.ensureRunning();
    sound.playClick();
    if (sceneManagerRef.current) {
      sceneManagerRef.current.loadTrack(selectedTrack);
      sceneManagerRef.current.setMode('playing');
    }
    setGameState('playing');
    document.body.dataset.state = 'playing';
  };

  const handlePause = () => {
    sound.playClick();
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setMode('paused');
    }
    setGameState('paused');
    document.body.dataset.state = 'paused';
  };

  const handleResume = () => {
    sound.playClick();
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setMode('playing');
    }
    setGameState('playing');
    document.body.dataset.state = 'playing';
  };

  const handleRestart = () => {
    sound.playClick();
    if (sceneManagerRef.current) {
      sceneManagerRef.current.restartCurrentTrack();
    }
    setGameState('playing');
    document.body.dataset.state = 'playing';
  };

  const handleReturnHome = () => {
    sound.playClick();
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setMode('title');
    }
    setGameState('title');
    setActiveModal('none');
    document.body.dataset.state = 'title';
  };

  const handleSelectTrack = (track: TrackDefinition) => {
    sound.playClick();
    setSelectedTrack(track);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.loadTrack(track);
    }
    setActiveModal('none');
    handleStartGame();
  };

  const handleNextTrack = () => {
    sound.playClick();
    const curIdx = TRACKS.findIndex((t) => t.id === selectedTrack.id);
    const nextIdx = (curIdx + 1) % TRACKS.length;
    const nextTrack = TRACKS[nextIdx];
    setSelectedTrack(nextTrack);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.loadTrack(nextTrack);
    }
    setGameState('playing');
    document.body.dataset.state = 'playing';
  };

  const handleCalibrate = () => {
    inputManager.calibrateNeutral();
    const sensor = inputManager.getSensorState();
    const updated: UserProgress = {
      ...progress,
      settings: {
        ...progress.settings,
        neutralGamma: sensor.rawGamma,
        neutralBeta: sensor.rawBeta,
      },
    };
    setProgress(updated);
    saveUserProgress(updated);
    sound.playClick();
  };

  const handleToggleMute = () => {
    const updated: UserProgress = {
      ...progress,
      settings: {
        ...progress.settings,
        isMuted: !progress.settings.isMuted,
      },
    };
    setProgress(updated);
    saveUserProgress(updated);
  };

  const handleRequestSensorPermission = async () => {
    sound.ensureRunning();
    sound.playClick();
    await inputManager.requestOrientationPermission();
    setSensorState(inputManager.getSensorState());
  };

  const handlePreviewSkin = (skin: BallSkin) => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.updateSkin(skin);
    }
  };

  const handlePreviewTrail = (trail: BallTrail) => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.updateTrail(trail);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      {/* 1. Isolated 3D WebGL Canvas Container */}
      <div
        ref={canvasContainerRef}
        data-testid="threejs-canvas-container"
        className="absolute inset-0 w-full h-full z-0"
      />

      {/* 2. Title Screen View */}
      {gameState === 'title' && activeModal === 'none' && (
        <TitleScreen
          onStartGame={handleStartGame}
          onOpenLevelSelect={() => {
            sound.playClick();
            setActiveModal('level_select');
          }}
          onOpenCustomization={() => {
            sound.playClick();
            if (sceneManagerRef.current) sceneManagerRef.current.setMode('customization');
            setActiveModal('customization');
          }}
          onOpenSettings={() => {
            sound.playClick();
            setActiveModal('settings');
          }}
          onOpenHowToPlay={() => {
            sound.playClick();
            setActiveModal('how_to_play');
          }}
          sensorState={sensorState}
          onRequestSensorPermission={handleRequestSensorPermission}
          selectedTrack={selectedTrack}
          coins={progress.coins}
        />
      )}

      {/* 3. In-Game Playing HUD */}
      {gameState === 'playing' && (
        <GameHUD
          track={selectedTrack}
          speed={hudStats.speed}
          time={hudStats.time}
          falls={hudStats.falls}
          currentCheckpoint={hudStats.currentCheckpoint}
          totalCheckpoints={hudStats.totalCheckpoints}
          isRecovering={hudStats.isRecovering}
          isMuted={progress.settings.isMuted}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onRestart={handleRestart}
          onCalibrate={handleCalibrate}
          sensorState={sensorState}
          controlMode={progress.settings.controlMode}
          onTouchSteer={(steer, throttle, brake) => {
            inputManager.setTouchInput(steer, throttle, brake);
          }}
        />
      )}

      {/* 4. Pause Modal */}
      {gameState === 'paused' && (
        <PauseModal
          track={selectedTrack}
          onResume={handleResume}
          onRestart={handleRestart}
          onLevelSelect={() => {
            setGameState('title');
            document.body.dataset.state = 'title';
            setActiveModal('level_select');
          }}
          onHome={handleReturnHome}
        />
      )}

      {/* 5. Victory Modal */}
      {gameState === 'gameover' && victoryData && (
        <VictoryModal
          track={selectedTrack}
          time={victoryData.time}
          falls={victoryData.falls}
          stars={victoryData.stars}
          earnedCoins={victoryData.earnedCoins}
          isNewBest={victoryData.isNewBest}
          onReplay={handleRestart}
          onNextTrack={handleNextTrack}
          onLevelSelect={() => {
            setGameState('title');
            document.body.dataset.state = 'title';
            setActiveModal('level_select');
          }}
        />
      )}

      {/* 6. Level Select Modal */}
      {activeModal === 'level_select' && (
        <LevelSelectModal
          onClose={() => setActiveModal('none')}
          onSelectTrack={handleSelectTrack}
          progress={progress}
        />
      )}

      {/* 7. Ball Garage / Customization Modal */}
      {activeModal === 'customization' && (
        <CustomizationModal
          onClose={() => {
            sound.playClick();
            if (sceneManagerRef.current) sceneManagerRef.current.setMode('title');
            setActiveModal('none');
          }}
          progress={progress}
          onUpdateProgress={(updated) => {
            setProgress(updated);
            saveUserProgress(updated);
          }}
          onPreviewSkin={handlePreviewSkin}
          onPreviewTrail={handlePreviewTrail}
        />
      )}

      {/* 8. Settings Modal */}
      {activeModal === 'settings' && (
        <SettingsModal
          onClose={() => {
            sound.playClick();
            setActiveModal('none');
          }}
          progress={progress}
          onUpdateSettings={(updatedSettings) => {
            const updated = { ...progress, settings: updatedSettings };
            setProgress(updated);
            saveUserProgress(updated);
          }}
          sensorState={sensorState}
          onCalibrate={handleCalibrate}
        />
      )}

      {/* 9. How To Play Modal */}
      {activeModal === 'how_to_play' && (
        <HowToPlayModal
          onClose={() => {
            sound.playClick();
            setActiveModal('none');
          }}
        />
      )}
    </div>
  );
}
