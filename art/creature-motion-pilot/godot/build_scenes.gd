extends SceneTree


var source_size := Vector2(300, 300)


func _initialize() -> void:
	var catalog: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://catalog.json"))
	source_size = Vector2(catalog["sourceCanvas"][0], catalog["sourceCanvas"][1])
	for species in ["akinza", "avilily", "frackworm"]:
		var folder := "res://assets/%s" % species
		var files := DirAccess.get_files_at(folder)
		if files.is_empty():
			printerr("No raster parts imported for ", species)
			quit(2)
			return
		for file in files:
			if file.ends_with(".png") and load(folder.path_join(file)) == null:
				printerr("Raster part not imported: ", folder.path_join(file))
				quit(2)
				return
	DirAccess.make_dir_recursive_absolute("res://scenes")
	build_akinza()
	build_avilily()
	build_frackworm()
	quit()


func part(parent: Node2D, species: String, name: String, pivot: Vector2, parent_pivot: Vector2, z: int = 0) -> Node2D:
	var joint := Node2D.new()
	joint.name = name
	joint.position = pivot - parent_pivot
	joint.z_index = z
	parent.add_child(joint)
	joint.owner = parent.owner if parent.owner != null else parent
	var sprite := Sprite2D.new()
	sprite.name = "art"
	sprite.texture = load("res://assets/%s/%s.png" % [species, name])
	assert(sprite.texture != null, "Missing raster part %s/%s" % [species, name])
	sprite.position = source_size / 2.0 - pivot
	joint.add_child(sprite)
	sprite.owner = joint.owner
	return joint


func rig_root(species: String) -> Dictionary:
	var root := Node2D.new()
	root.name = species
	var rig := Node2D.new()
	rig.name = "rig"
	root.add_child(rig)
	rig.owner = root
	var player := AnimationPlayer.new()
	player.name = "AnimationPlayer"
	root.add_child(player)
	player.owner = root
	player.root_node = NodePath("..")
	return {"root": root, "rig": rig, "player": player}


func clip(player: AnimationPlayer, name: String, duration: float, looping: bool, poses: Dictionary) -> void:
	var animation := Animation.new()
	animation.length = duration
	animation.loop_mode = Animation.LOOP_LINEAR if looping else Animation.LOOP_NONE
	for path in poses:
		var track := animation.add_track(Animation.TYPE_VALUE)
		animation.track_set_path(track, NodePath(path))
		animation.track_set_interpolation_type(track, Animation.INTERPOLATION_CUBIC)
		for key in poses[path]:
			animation.track_insert_key(track, key[0], key[1])
	var library: AnimationLibrary
	if player.has_animation_library(""):
		library = player.get_animation_library("")
	else:
		library = AnimationLibrary.new()
		player.add_animation_library("", library)
	library.add_animation(name, animation)


func save_scene(root: Node2D, species: String) -> void:
	var scene := PackedScene.new()
	assert(scene.pack(root) == OK)
	assert(ResourceSaver.save(scene, "res://scenes/%s.tscn" % species) == OK)
	print("Saved %s scene" % species)
	root.free()


func build_akinza() -> void:
	var nodes := rig_root("akinza")
	var snow := part(nodes.root, "akinza", "snow_wake", Vector2(120, 270), Vector2.ZERO, -5)
	snow.modulate = Color(1, 1, 1, 0)
	var rig: Node2D = nodes.rig
	var torso := part(rig, "akinza", "torso", Vector2(135, 163), Vector2.ZERO)
	var tail := part(torso, "akinza", "tail_base", Vector2(120, 179), Vector2(135, 163), -2)
	part(tail, "akinza", "tail_tip", Vector2(61, 224), Vector2(120, 179))
	part(torso, "akinza", "rear_leg", Vector2(115, 190), Vector2(135, 163), -1)
	part(torso, "akinza", "rear_arm", Vector2(112, 130), Vector2(135, 163), -1)
	part(torso, "akinza", "front_leg", Vector2(150, 191), Vector2(135, 163))
	var head := part(torso, "akinza", "head", Vector2(138, 112), Vector2(135, 163), 1)
	part(head, "akinza", "left_ear", Vector2(125, 79), Vector2(138, 112), -1)
	part(head, "akinza", "right_ear", Vector2(151, 78), Vector2(138, 112), -1)
	part(torso, "akinza", "front_arm", Vector2(156, 132), Vector2(135, 163), 2)
	var player: AnimationPlayer = nodes.player
	clip(player, "idle", 2.0, true, {
		"rig/torso:rotation_degrees": [[0.0, 0.0], [0.5, -2.0], [1.0, 0.0], [1.5, 2.0], [2.0, 0.0]],
		"rig/torso/head:rotation_degrees": [[0.0, 0.0], [0.5, 2.0], [1.0, 0.0], [1.5, -2.0], [2.0, 0.0]],
		"rig/torso/tail_base:rotation_degrees": [[0.0, -5.0], [0.5, 4.0], [1.0, 9.0], [1.5, 1.0], [2.0, -5.0]],
		"rig/torso/tail_base/tail_tip:rotation_degrees": [[0.0, 8.0], [0.5, -8.0], [1.0, -12.0], [1.5, 4.0], [2.0, 8.0]],
		"rig/torso/head/left_ear:rotation_degrees": [[0.0, 0.0], [0.8, 0.0], [0.95, -12.0], [1.12, 0.0], [2.0, 0.0]],
		"rig/torso/head/right_ear:rotation_degrees": [[0.0, 0.0], [0.8, 0.0], [0.95, 9.0], [1.12, 0.0], [2.0, 0.0]],
	})
	clip(player, "action", 1.1, false, {
		"snow_wake:modulate": [[0.0, Color(1, 1, 1, 0)], [0.37, Color(1, 1, 1, 0)], [0.48, Color(1, 1, 1, 0.8)], [0.61, Color(1, 1, 1, 0.95)], [0.82, Color(1, 1, 1, 0.25)], [0.96, Color(1, 1, 1, 0)], [1.1, Color(1, 1, 1, 0)]],
		"snow_wake:scale": [[0.0, Vector2(0.65, 0.65)], [0.37, Vector2(0.65, 0.65)], [0.61, Vector2.ONE], [0.96, Vector2(1.25, 1.1)], [1.1, Vector2(1.25, 1.1)]],
		"rig:position": [[0.0, Vector2.ZERO], [0.22, Vector2(-15, 13)], [0.37, Vector2(-13, 14)], [0.56, Vector2(54, -12)], [0.67, Vector2(57, -9)], [0.86, Vector2(11, 0)], [1.1, Vector2.ZERO]],
		"rig/torso:rotation_degrees": [[0.0, 0.0], [0.22, -15.0], [0.37, -18.0], [0.56, 17.0], [0.67, 14.0], [0.86, -5.0], [1.1, 0.0]],
		"rig/torso/head:rotation_degrees": [[0.0, 0.0], [0.22, -13.0], [0.37, -16.0], [0.56, 9.0], [0.67, 7.0], [1.1, 0.0]],
		"rig/torso/front_arm:rotation_degrees": [[0.0, 0.0], [0.22, -55.0], [0.37, -70.0], [0.56, 75.0], [0.67, 67.0], [0.86, -12.0], [1.1, 0.0]],
		"rig/torso/rear_arm:rotation_degrees": [[0.0, 0.0], [0.22, -25.0], [0.37, -31.0], [0.56, 35.0], [1.1, 0.0]],
		"rig/torso/front_leg:rotation_degrees": [[0.0, 0.0], [0.22, 20.0], [0.37, 25.0], [0.56, -37.0], [0.67, -30.0], [1.1, 0.0]],
		"rig/torso/rear_leg:rotation_degrees": [[0.0, 0.0], [0.22, -25.0], [0.37, -31.0], [0.56, 42.0], [0.67, 35.0], [1.1, 0.0]],
		"rig/torso/tail_base:rotation_degrees": [[0.0, -5.0], [0.22, 33.0], [0.37, 39.0], [0.56, -29.0], [0.67, -37.0], [1.1, -5.0]],
		"rig/torso/tail_base/tail_tip:rotation_degrees": [[0.0, 8.0], [0.22, 22.0], [0.56, -25.0], [0.67, -35.0], [1.1, 8.0]],
	})
	clip(player, "hit", 0.7, false, {
		"rig:position": [[0.0, Vector2.ZERO], [0.12, Vector2(-23, 2)], [0.24, Vector2(-27, 5)], [0.48, Vector2(-6, 1)], [0.7, Vector2.ZERO]],
		"rig/torso:rotation_degrees": [[0.0, 0.0], [0.12, -22.0], [0.24, -25.0], [0.48, 6.0], [0.7, 0.0]],
		"rig/torso/head:rotation_degrees": [[0.0, 0.0], [0.12, -20.0], [0.24, -26.0], [0.48, 7.0], [0.7, 0.0]],
		"rig/torso/front_arm:rotation_degrees": [[0.0, 0.0], [0.12, -70.0], [0.24, -75.0], [0.48, 16.0], [0.7, 0.0]],
		"rig/torso/rear_arm:rotation_degrees": [[0.0, 0.0], [0.12, -46.0], [0.24, -49.0], [0.7, 0.0]],
		"rig/torso/tail_base:rotation_degrees": [[0.0, -5.0], [0.12, 26.0], [0.24, 32.0], [0.48, -10.0], [0.7, -5.0]],
	})
	save_scene(nodes.root, "akinza")


func build_avilily() -> void:
	var nodes := rig_root("avilily")
	var rig: Node2D = nodes.rig
	var body := part(rig, "avilily", "body", Vector2(151, 168), Vector2.ZERO)
	part(body, "avilily", "rear_wing", Vector2(137, 146), Vector2(151, 168), -2)
	part(body, "avilily", "front_wing", Vector2(164, 144), Vector2(151, 168), 1)
	part(body, "avilily", "rear_foot", Vector2(138, 214), Vector2(151, 168), -1)
	part(body, "avilily", "front_foot", Vector2(165, 218), Vector2(151, 168), 1)
	var head := part(body, "avilily", "head", Vector2(162, 99), Vector2(151, 168), 3)
	part(head, "avilily", "tail_streamer_back", Vector2(138, 109), Vector2(162, 99), -5)
	part(head, "avilily", "tail_streamer_front", Vector2(148, 116), Vector2(162, 99), -4)
	part(head, "avilily", "crest", Vector2(162, 73), Vector2(162, 99), -1)
	part(head, "avilily", "throat", Vector2(195, 111), Vector2(162, 99))
	part(head, "avilily", "petal_top", Vector2(187, 106), Vector2(162, 99), 1)
	part(head, "avilily", "petal_bottom", Vector2(187, 119), Vector2(162, 99), 2)
	part(head, "avilily", "petal_near", Vector2(189, 112), Vector2(162, 99), 3)
	var player: AnimationPlayer = nodes.player
	clip(player, "idle", 1.6, true, {
		"rig:position": [[0.0, Vector2.ZERO], [0.4, Vector2(0, -4)], [0.8, Vector2.ZERO], [1.2, Vector2(0, 3)], [1.6, Vector2.ZERO]],
		"rig/body:rotation_degrees": [[0.0, 0.0], [0.4, -3.0], [0.8, 0.0], [1.2, 3.0], [1.6, 0.0]],
		"rig/body/rear_wing:rotation_degrees": [[0.0, -9.0], [0.4, 13.0], [0.8, -9.0], [1.2, 13.0], [1.6, -9.0]],
		"rig/body/front_wing:rotation_degrees": [[0.0, 9.0], [0.4, -13.0], [0.8, 9.0], [1.2, -13.0], [1.6, 9.0]],
		"rig/body/head:rotation_degrees": [[0.0, 0.0], [0.4, 2.0], [0.8, 0.0], [1.2, -2.0], [1.6, 0.0]],
		"rig/body/head/crest:rotation_degrees": [[0.0, -3.0], [0.4, 3.0], [0.8, -3.0], [1.2, 3.0], [1.6, -3.0]],
		"rig/body/head/tail_streamer_back:rotation_degrees": [[0.0, 6.0], [0.4, -5.0], [0.8, 4.0], [1.2, -7.0], [1.6, 6.0]],
		"rig/body/head/tail_streamer_front:rotation_degrees": [[0.0, -4.0], [0.4, 5.0], [0.8, -3.0], [1.2, 6.0], [1.6, -4.0]],
	})
	clip(player, "action", 1.25, false, {
		"rig:position": [[0.0, Vector2.ZERO], [0.25, Vector2(-13, 9)], [0.39, Vector2(-15, 10)], [0.62, Vector2(36, -29)], [0.78, Vector2(42, -26)], [1.02, Vector2(9, -6)], [1.25, Vector2.ZERO]],
		"rig/body:rotation_degrees": [[0.0, 0.0], [0.25, -12.0], [0.39, -15.0], [0.62, 11.0], [0.78, 9.0], [1.25, 0.0]],
		"rig/body/rear_wing:rotation_degrees": [[0.0, -9.0], [0.25, -32.0], [0.39, -37.0], [0.62, 33.0], [0.78, 28.0], [1.02, -8.0], [1.25, -9.0]],
		"rig/body/front_wing:rotation_degrees": [[0.0, 9.0], [0.25, 32.0], [0.39, 38.0], [0.62, -38.0], [0.78, -31.0], [1.02, 7.0], [1.25, 9.0]],
		"rig/body/head:rotation_degrees": [[0.0, 0.0], [0.25, -13.0], [0.39, -16.0], [0.62, 12.0], [0.78, 9.0], [1.25, 0.0]],
		"rig/body/rear_foot:rotation_degrees": [[0.0, 0.0], [0.25, 18.0], [0.39, 23.0], [0.62, -20.0], [0.78, -15.0], [1.25, 0.0]],
		"rig/body/front_foot:rotation_degrees": [[0.0, 0.0], [0.25, -15.0], [0.39, -19.0], [0.62, 22.0], [0.78, 16.0], [1.25, 0.0]],
		"rig/body/head/petal_top:rotation_degrees": [[0.0, 0.0], [0.32, 0.0], [0.53, -48.0], [0.7, -62.0], [0.82, -56.0], [1.08, -10.0], [1.25, 0.0]],
		"rig/body/head/petal_bottom:rotation_degrees": [[0.0, 0.0], [0.32, 0.0], [0.53, 43.0], [0.7, 58.0], [0.82, 54.0], [1.08, 8.0], [1.25, 0.0]],
		"rig/body/head/petal_near:rotation_degrees": [[0.0, 0.0], [0.32, 0.0], [0.53, 20.0], [0.7, 35.0], [0.82, 32.0], [1.08, 5.0], [1.25, 0.0]],
		"rig/body/head/throat:scale": [[0.0, Vector2.ONE], [0.32, Vector2.ONE], [0.7, Vector2(1.35, 1.35)], [0.82, Vector2(1.3, 1.3)], [1.25, Vector2.ONE]],
		"rig/body/head/tail_streamer_back:rotation_degrees": [[0.0, 6.0], [0.25, 25.0], [0.39, 30.0], [0.62, -27.0], [0.78, -31.0], [1.25, 6.0]],
		"rig/body/head/tail_streamer_front:rotation_degrees": [[0.0, -4.0], [0.25, 17.0], [0.39, 21.0], [0.62, -34.0], [0.78, -37.0], [1.25, -4.0]],
	})
	clip(player, "hit", 0.72, false, {
		"rig:position": [[0.0, Vector2.ZERO], [0.13, Vector2(-18, 9)], [0.22, Vector2(-23, 13)], [0.5, Vector2(-5, 3)], [0.72, Vector2.ZERO]],
		"rig/body:rotation_degrees": [[0.0, 0.0], [0.13, -18.0], [0.22, -23.0], [0.5, 7.0], [0.72, 0.0]],
		"rig/body/rear_wing:rotation_degrees": [[0.0, -9.0], [0.13, -48.0], [0.22, -55.0], [0.5, 20.0], [0.72, -9.0]],
		"rig/body/front_wing:rotation_degrees": [[0.0, 9.0], [0.13, 50.0], [0.22, 57.0], [0.5, -19.0], [0.72, 9.0]],
		"rig/body/head:rotation_degrees": [[0.0, 0.0], [0.13, -19.0], [0.22, -25.0], [0.5, 8.0], [0.72, 0.0]],
		"rig/body/head/petal_top:rotation_degrees": [[0.0, 0.0], [0.13, -15.0], [0.22, -18.0], [0.72, 0.0]],
		"rig/body/head/petal_bottom:rotation_degrees": [[0.0, 0.0], [0.13, 15.0], [0.22, 18.0], [0.72, 0.0]],
		"rig/body/head/tail_streamer_back:rotation_degrees": [[0.0, 6.0], [0.13, 34.0], [0.22, 41.0], [0.5, -10.0], [0.72, 6.0]],
	})
	save_scene(nodes.root, "avilily")


func build_frackworm() -> void:
	var nodes := rig_root("frackworm")
	var rig: Node2D = nodes.rig
	var parent: Node2D = rig
	var joints := {}
	var prior := Vector2.ZERO
	var pivots := [Vector2(55, 247), Vector2(74, 218), Vector2(103, 194), Vector2(133, 169), Vector2(163, 144), Vector2(191, 119), Vector2(212, 97), Vector2(237, 91), Vector2(241, 122)]
	var names := ["tail", "segment_1", "segment_2", "segment_3", "segment_4", "segment_5", "collar", "drill_head", "jaw_lower"]
	for index in names.size():
		parent = part(parent, "frackworm", names[index], pivots[index], prior, index)
		joints[names[index]] = parent
		prior = pivots[index]
	var slurry := part(joints["segment_4"], "frackworm", "sand_slurry", Vector2(171, 164), pivots[4], -2)
	slurry.modulate = Color(1, 1, 1, 0)
	var player: AnimationPlayer = nodes.player
	var chain := "rig/tail"
	var paths: Array[String] = []
	for index in names.size():
		if index > 0:
			chain += "/" + names[index]
		paths.append(chain + ":rotation_degrees")
	var slurry_path: String = paths[4].replace(":rotation_degrees", "/sand_slurry")
	clip(player, "idle", 2.0, true, {
		paths[1]: [[0.0, 0.0], [0.5, 3.0], [1.0, 0.0], [1.5, -3.0], [2.0, 0.0]],
		paths[2]: [[0.0, 0.0], [0.5, -4.0], [1.0, 1.0], [1.5, 4.0], [2.0, 0.0]],
		paths[3]: [[0.0, 0.0], [0.5, 3.0], [1.0, -3.0], [1.5, 2.0], [2.0, 0.0]],
		paths[4]: [[0.0, 0.0], [0.5, -2.0], [1.0, 2.0], [1.5, -2.0], [2.0, 0.0]],
		paths[7]: [[0.0, -4.0], [0.5, 3.0], [1.0, -4.0], [1.5, 3.0], [2.0, -4.0]],
		paths[8]: [[0.0, 0.0], [0.5, 5.0], [1.0, 1.0], [1.5, 6.0], [2.0, 0.0]],
	})
	clip(player, "action", 1.15, false, {
		slurry_path + ":modulate": [[0.0, Color(1, 1, 1, 0)], [0.42, Color(1, 1, 1, 0)], [0.54, Color(1, 1, 1, 0.8)], [0.7, Color(1, 1, 1, 1)], [0.92, Color(1, 1, 1, 0.2)], [1.05, Color(1, 1, 1, 0)], [1.15, Color(1, 1, 1, 0)]],
		slurry_path + ":scale": [[0.0, Vector2(0.45, 0.45)], [0.42, Vector2(0.45, 0.45)], [0.7, Vector2.ONE], [1.05, Vector2(1.2, 1.05)], [1.15, Vector2(1.2, 1.05)]],
		"rig:position": [[0.0, Vector2.ZERO], [0.29, Vector2(-9, 8)], [0.42, Vector2(-12, 10)], [0.59, Vector2(23, -25)], [0.72, Vector2(27, -28)], [0.94, Vector2(5, -4)], [1.15, Vector2.ZERO]],
		paths[1]: [[0.0, 0.0], [0.29, 18.0], [0.42, 24.0], [0.59, -22.0], [0.72, -17.0], [1.15, 0.0]],
		paths[2]: [[0.0, 0.0], [0.29, -32.0], [0.42, -37.0], [0.59, 22.0], [0.72, 17.0], [1.15, 0.0]],
		paths[3]: [[0.0, 0.0], [0.29, 24.0], [0.42, 28.0], [0.59, -15.0], [0.72, -12.0], [1.15, 0.0]],
		paths[4]: [[0.0, 0.0], [0.29, -14.0], [0.42, -17.0], [0.59, 12.0], [0.72, 10.0], [1.15, 0.0]],
		paths[5]: [[0.0, 0.0], [0.29, 10.0], [0.42, 13.0], [0.59, -11.0], [0.72, -9.0], [1.15, 0.0]],
		paths[7]: [[0.0, 0.0], [0.29, -30.0], [0.42, -38.0], [0.59, 57.0], [0.72, 65.0], [0.94, -8.0], [1.15, 0.0]],
		paths[8]: [[0.0, 0.0], [0.29, 24.0], [0.42, 31.0], [0.59, -30.0], [0.72, -38.0], [1.15, 0.0]],
	})
	clip(player, "hit", 0.75, false, {
		"rig:position": [[0.0, Vector2.ZERO], [0.16, Vector2(-16, 14)], [0.29, Vector2(-20, 18)], [0.53, Vector2(-4, 4)], [0.75, Vector2.ZERO]],
		paths[2]: [[0.0, 0.0], [0.16, 19.0], [0.29, 23.0], [0.53, -7.0], [0.75, 0.0]],
		paths[3]: [[0.0, 0.0], [0.16, -25.0], [0.29, -29.0], [0.53, 9.0], [0.75, 0.0]],
		paths[4]: [[0.0, 0.0], [0.16, 23.0], [0.29, 27.0], [0.53, -6.0], [0.75, 0.0]],
		paths[7]: [[0.0, 0.0], [0.16, -37.0], [0.29, -44.0], [0.53, 13.0], [0.75, 0.0]],
		paths[8]: [[0.0, 0.0], [0.16, 28.0], [0.29, 36.0], [0.53, 5.0], [0.75, 0.0]],
	})
	save_scene(nodes.root, "frackworm")
