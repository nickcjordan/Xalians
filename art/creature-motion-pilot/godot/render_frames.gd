extends SceneTree


func _initialize() -> void:
	call_deferred("render_all")


func render_all() -> void:
	var catalog: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://catalog.json"))
	var cell: Array = catalog["captureCell"]
	var offset: Array = catalog["captureOffset"]
	var viewport := SubViewport.new()
	viewport.name = "FrameCapture"
	viewport.size = Vector2i(cell[0], cell[1])
	viewport.transparent_bg = true
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(viewport)
	for species in catalog["species"]:
		var scene: PackedScene = load("res://scenes/%s.tscn" % species)
		assert(scene != null, "Missing rig scene for %s" % species)
		var clip_settings: Dictionary = catalog["species"][species]["clips"]
		for clip_name in clip_settings:
			var creature: Node2D = scene.instantiate()
			creature.position = Vector2(offset[0], offset[1])
			viewport.add_child(creature)
			var player: AnimationPlayer = creature.get_node("AnimationPlayer")
			assert(player.has_animation(clip_name), "Missing %s clip for %s" % [clip_name, species])
			var animation: Animation = player.get_animation(clip_name)
			assert((animation.loop_mode != Animation.LOOP_NONE) == clip_settings[clip_name]["loop"], "Loop setting differs from catalog")
			var duration: float = animation.length
			var fps: int = clip_settings[clip_name]["fps"]
			var frame_count := roundi(duration * fps)
			var folder := ProjectSettings.globalize_path("res://../exports/%s/%s" % [species, clip_name])
			DirAccess.make_dir_recursive_absolute(folder)
			for frame in frame_count:
				player.play(clip_name)
				player.pause()
				player.seek(float(frame) / fps, true)
				await RenderingServer.frame_post_draw
				var image := viewport.get_texture().get_image()
				var destination := folder.path_join("%03d.png" % frame)
				assert(image.save_png(destination) == OK)
			var info := FileAccess.open(folder.path_join("render-info.json"), FileAccess.WRITE)
			assert(info != null)
			info.store_string(JSON.stringify({"frames": frame_count, "fps": fps, "length_seconds": duration}))
			info.close()
			print("Rendered %s/%s: %s frames" % [species, clip_name, frame_count])
			viewport.remove_child(creature)
			creature.free()
	viewport.queue_free()
	quit()
