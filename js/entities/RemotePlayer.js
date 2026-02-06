class RemotePlayer extends Player {
  constructor(id, name, x, y) {
    super(id, name, x, y);
    this.interpolator = new Interpolator(2);
    this.interpolationTime = 0;
  }

  updateFromServer(serverData) {
    this.interpolator.addState({
      position: { ...serverData.position },
      velocity: { ...serverData.velocity },
      rotation: serverData.rotation
    });

    this.essenceCount = serverData.essenceCount;
    this.health = serverData.health;
    this.radius = 8 + (this.essenceCount * 0.3);
  }

  update(deltaTime) {
    this.interpolationTime += deltaTime;
    const interpolated = this.interpolator.getInterpolatedState(Date.now() - ClientConfig.INTERPOLATION_BUFFER_SIZE);

    if (interpolated) {
      this.position.set(interpolated.position.x, interpolated.position.y);
      this.velocity.set(interpolated.velocity.x, interpolated.velocity.y);
      this.rotation = interpolated.rotation;
    }

    this.glowTarget = 0.3 + (this.essenceCount / 200);
    this.glowIntensity += (this.glowTarget - this.glowIntensity) * 0.1;
  }
}
