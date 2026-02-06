class Player extends Entity {
  constructor(id, name, x, y) {
    super(id, x, y, 8);
    this.name = name;
    this.type = 'player';
    this.essenceCount = 0;
    this.health = 100;
    this.maxHealth = 100;
    this.mana = 100;
    this.maxMana = 100;
    
    this.lastServerPosition = new Vector2(x, y);
    this.lastServerVelocity = new Vector2(0, 0);
    this.predictionError = new Vector2(0, 0);
    
    this.inputState = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    this.glowIntensity = 0;
    this.glowTarget = 0;
  }

  setInputState(keys) {
    this.inputState.up = keys.includes('w') || keys.includes('ArrowUp');
    this.inputState.down = keys.includes('s') || keys.includes('ArrowDown');
    this.inputState.left = keys.includes('a') || keys.includes('ArrowLeft');
    this.inputState.right = keys.includes('d') || keys.includes('ArrowRight');
  }

  getInputVector() {
    let x = 0, y = 0;

    if (this.inputState.up) y -= 1;
    if (this.inputState.down) y += 1;
    if (this.inputState.left) x -= 1;
    if (this.inputState.right) x += 1;

    const magnitude = Math.hypot(x, y);
    if (magnitude > 0) {
      x /= magnitude;
      y /= magnitude;
    }

    return { x, y };
  }

  predictMovement(deltaTime) {
    const input = this.getInputVector();
    const acceleration = 300;
    const maxVelocity = 250;

    this.velocity.x += input.x * acceleration * deltaTime;
    this.velocity.y += input.y * acceleration * deltaTime;

    this.velocity.multiply(1 - 0.08 * deltaTime);

    const velocityMag = this.velocity.magnitude();
    const sizePenalty = Math.pow(this.essenceCount / 100, 0.3);
    const adjustedMaxVelocity = maxVelocity * (1 - sizePenalty * 0.5);

    if (velocityMag > adjustedMaxVelocity) {
      this.velocity.normalize().multiply(adjustedMaxVelocity);
    }

    this.position.add(new Vector2(this.velocity.x * deltaTime, this.velocity.y * deltaTime));

    if (velocityMag > 0.1) {
      this.rotation = Math.atan2(this.velocity.y, this.velocity.x);
    }

    const worldSize = ClientConfig.WORLD_SIZE;
    this.position.x = Math.max(this.radius, Math.min(worldSize.width - this.radius, this.position.x));
    this.position.y = Math.max(this.radius, Math.min(worldSize.height - this.radius, this.position.y));

    this.radius = 8 + (this.essenceCount * 0.3);
  }

  applyServerUpdate(serverData) {
    this.lastServerPosition.set(serverData.position.x, serverData.position.y);
    this.lastServerVelocity.set(serverData.velocity.x, serverData.velocity.y);
    
    this.position.lerp(serverData.position, 0.1);
    this.essenceCount = serverData.essenceCount;
    this.radius = 8 + (this.essenceCount * 0.3);
  }

  update(deltaTime) {
    this.predictMovement(deltaTime);

    this.glowTarget = 0.3 + (this.essenceCount / 200);
    this.glowIntensity += (this.glowTarget - this.glowIntensity) * 0.1;
  }

  render(ctx, cameraX, cameraY) {
    const screenX = this.position.x - cameraX;
    const screenY = this.position.y - cameraY;

    const gradient = ctx.createRadialGradient(screenX, screenY, this.radius - 5, screenX, screenY, this.radius + 20);
    gradient.addColorStop(0, `rgba(0, 212, 255, ${this.glowIntensity})`);
    gradient.addColorStop(1, `rgba(0, 212, 255, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(screenX - this.radius - 20, screenY - this.radius - 20, this.radius * 2 + 40, this.radius * 2 + 40);

    ctx.fillStyle = '#00d4ff';
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
    ctx.fill();

    const dirX = Math.cos(this.rotation);
    const dirY = Math.sin(this.rotation);
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(screenX + dirX * this.radius * 1.5, screenY + dirY * this.radius * 1.5);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, screenX, screenY - this.radius - 10);
  }
}