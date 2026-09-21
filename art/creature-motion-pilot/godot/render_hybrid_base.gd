extends SceneTree


func _initialize() -> void:
	call_deferred("render_action")


func render_action() -> void:
	var viewport := SubViewport.new()
	viewport.size = Vector2i(384, 384)
	viewport.transparent_bg = true
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(viewport)
	var scene: PackedScene = load("res://scenes/avilily.tscn")
	var creature: Node2D = scene.instantiate()
	creature.position = Vector2(42, 42)
	viewport.add_child(creature)
	for part in ["petal_top", "petal_bottom", "petal_near"]:
		creature.get_node("rig/body/head/%s" % part).visible = false
	var player: AnimationPlayer = creature.get_node("AnimationPlayer")
	var folder := ProjectSettings.globalize_path("res://../../creature-motion-comparison/hybrid-base")
	DirAccess.make_dir_recursive_absolute(folder)
	for frame in 30:
		player.play("action")
		player.pause()
		player.seek(float(frame) / 24.0, true)
		await RenderingServer.frame_post_draw
		var image := viewport.get_texture().get_image()
		assert(image.save_png(folder.path_join("%03d.png" % frame)) == OK)
	print("Rendered Avilily action without cutout petals: 30 frames")
	viewport.queue_free()
	quit()
