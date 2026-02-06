class RenderSystem {
  constructor(ctx, canvas) {
    this.ctx = ctx;
    this.canvas = canvas;
  }

  renderWorld(ctx, localPlayer, remotePlayers, essences, npcs, cameraX, cameraY) {
    // Clear canvas
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw subtle background gradient
    const gradient = ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    gradient.addColorStop(0, 'rgba(10, 14, 39, 0)');
    gradient.addColorStop(1, 'rgba(26, 31, 58, 0.2)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (!localPlayer) {
      console.warn('[RENDER] No local player to render');
      return;
    }

    // Draw world grid
    this.drawGrid(ctx, cameraX, cameraY, this.canvas.width, this.canvas.height);

    // Draw essences (behind everything)
    essences.forEach((essence) => {
      if (essence.isInViewport(cameraX, cameraY, this.canvas.width, this.canvas.height)) {
        essence.render(ctx, cameraX, cameraY);
      }
    });

    // Draw NPCs
    npcs.forEach((npc) => {
      if (npc.isInViewport(cameraX, cameraY, this.canvas.width, this.canvas.height)) {
        npc.render(ctx, cameraX, cameraY);
      }
    });

    // Draw remote players
    remotePlayers.forEach((player) => {
      if (player.isInViewport(cameraX, cameraY, this.canvas.width, this.canvas.height)) {
        player.render(ctx, cameraX, cameraY);
      }
    });

    // Draw local player (on top, always visible)
    const screenX = localPlayer.position.x - cameraX;
    const screenY = localPlayer.position.y - cameraY;
    
    // Only render if on screen
    if (screenX > -50 && screenX < this.canvas.width + 50 && 
        screenY > -50 && screenY < this.canvas.height + 50) {
      localPlayer.render(ctx, cameraX, cameraY);
    }

    // Draw world boundaries
    this.drawWorldBoundaries(ctx, cameraX, cameraY);

    // Draw debug info (optional)
    this.drawDebugInfo(ctx, localPlayer);
  }

  drawGrid(ctx, cameraX, cameraY, width, height) {
    const gridSize = 100;
    const gridColor = 'rgba(0, 212, 255, 0.03)';

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    // Draw vertical lines
    const startX = Math.floor(cameraX / gridSize) * gridSize;
    for (let x = startX; x < cameraX + width; x += gridSize) {
      const screenX = x - cameraX;
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, height);
      ctx.stroke();
    }

    // Draw horizontal lines
    const startY = Math.floor(cameraY / gridSize) * gridSize;
    for (let y = startY; y < cameraY + height; y += gridSize) {
      const screenY = y - cameraY;
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(width, screenY);
      ctx.stroke();
    }
  }

  drawWorldBoundaries(ctx, cameraX, cameraY) {
    const worldSize = ClientConfig.WORLD_SIZE;
    const borderColor = 'rgba(255, 100, 100, 0.3)';
    const borderWidth = 3;

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.setLineDash([10, 10]);

    // Top
    ctx.beginPath();
    ctx.moveTo(0 - cameraX, 0 - cameraY);
    ctx.lineTo(worldSize.width - cameraX, 0 - cameraY);
    ctx.stroke();

    // Bottom
    ctx.beginPath();
    ctx.moveTo(0 - cameraX, worldSize.height - cameraY);
    ctx.lineTo(worldSize.width - cameraX, worldSize.height - cameraY);
    ctx.stroke();

    // Left
    ctx.beginPath();
    ctx.moveTo(0 - cameraX, 0 - cameraY);
    ctx.lineTo(0 - cameraX, worldSize.height - cameraY);
    ctx.stroke();

    // Right
    ctx.beginPath();
    ctx.moveTo(worldSize.width - cameraX, 0 - cameraY);
    ctx.lineTo(worldSize.width - cameraX, worldSize.height - cameraY);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  drawDebugInfo(ctx, localPlayer) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(20, 150, 200, 80);

    ctx.fillStyle = '#00d4ff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';

    ctx.fillText(`Pos: (${Math.floor(localPlayer.position.x)}, ${Math.floor(localPlayer.position.y)})`, 30, 170);
    ctx.fillText(`Vel: (${Math.floor(localPlayer.velocity.x)}, ${Math.floor(localPlayer.velocity.y)})`, 30, 190);
    ctx.fillText(`Radius: ${Math.floor(localPlayer.radius)}`, 30, 210);
    ctx.fillText(`Essences: ${localPlayer.essenceCount}`, 30, 230);
  }
}
