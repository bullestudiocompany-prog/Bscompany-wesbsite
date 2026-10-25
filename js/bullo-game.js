(() => {
  if (window.__BS_BULLO_STARTED__) return;
  window.__BS_BULLO_STARTED__ = true;

  const root = document.createElement('div');
  root.id = 'bullo-phaser-root';
  document.body.appendChild(root);

  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js';
  script.onload = startBullo;
  script.onerror = () => console.error('Bullo: impossible de charger Phaser.');
  document.head.appendChild(script);

  function startBullo() {
    class BulloScene extends Phaser.Scene {
      constructor() { super('BulloScene'); }
      preload() {
        this.load.spritesheet('bullo', 'img/bullo-spritesheet.png', {
          frameWidth: 440,
          frameHeight: 440
        });
      }
      create() {
        // Les frames 0 à 6 sont les poses de la planche; la frame 7 est vide.
        this.anims.create({ key: 'peek', frames: [
          { key: 'bullo', frame: 0 },
          { key: 'bullo', frame: 1 },
          { key: 'bullo', frame: 2 },
          { key: 'bullo', frame: 3 },
          { key: 'bullo', frame: 4 },
          { key: 'bullo', frame: 3 },
          { key: 'bullo', frame: 2 },
          { key: 'bullo', frame: 1 }
        ], frameRate: 4, repeat: -1 });
        this.anims.create({ key: 'hide', frames: [
          { key: 'bullo', frame: 4 },
          { key: 'bullo', frame: 5 },
          { key: 'bullo', frame: 6 }
        ], frameRate: 12, repeat: 0 });

        this.bullo = this.add.sprite(25, this.scale.height - 5, 'bullo', 0)
          .setOrigin(0, 1).setScale(0.42).setInteractive({ useHandCursor: true });
        this.isHiding = false;
        this.isFollowing = false;

        // Entre depuis la gauche, puis reste à moitié caché au bord.
        this.bullo.x = -58;
        this.tweens.add({ targets: this.bullo, x: -4, duration: 750,
          ease: 'Sine.Out', onComplete: () => this.bullo.play('peek') });

        this.bullo.on('pointerdown', () => this.hideBullo());
        this.input.on('pointermove', pointer => {
          if (this.isHiding || !this.bullo) return;
          // Petit mouvement du regard simulé par une inclinaison subtile.
          const localX = pointer.x;
          this.bullo.setAngle(localX < this.scale.width * 0.35 ? -3 : 3);
        });
        this.input.on('pointerup', () => {
          if (!this.isHiding && this.bullo) this.bullo.setAngle(0);
        });
      }

      hideBullo() {
        if (this.isHiding) return;
        this.isHiding = true;
        this.bullo.anims.stop();
        this.tweens.killTweensOf(this.bullo);
        this.tweens.add({ targets: this.bullo, x: -110, duration: 260,
          ease: 'Quad.In', onComplete: () => {
            this.time.delayedCall(1100, () => {
              this.bullo.setFrame(0).setAngle(0);
              this.tweens.add({ targets: this.bullo, x: -4, duration: 700,
                ease: 'Sine.Out', onComplete: () => {
                  this.isHiding = false;
                  this.bullo.play('peek');
                }
              });
            });
          }
        });
      }
    }

    new Phaser.Game({
      type: Phaser.CANVAS,
      parent: root,
      transparent: true,
      width: 170,
      height: 220,
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
      scene: BulloScene,
      render: { transparent: true, antialias: true },
      input: { activePointers: 2 }
    });
  }
})();
