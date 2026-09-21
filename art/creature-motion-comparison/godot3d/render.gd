extends SceneTree

const SIZE := 384
var model: Node3D
var body: Node3D
var head: Node3D
var wing_back: Node3D
var wing_front: Node3D
var petal_pivots: Array[Node3D] = []
var streamers: Array[Node3D] = []


func _initialize() -> void:
	call_deferred("render_all")


func material(color: Color) -> StandardMaterial3D:
	var result := StandardMaterial3D.new()
	result.albedo_color = color
	result.roughness = 0.74
	result.metallic = 0.0
	return result


func ball(parent: Node3D, label: String, center: Vector3, dimensions: Vector3, color: Color) -> MeshInstance3D:
	var mesh := SphereMesh.new()
	mesh.radius = 1.0
	mesh.height = 2.0
	mesh.radial_segments = 20
	mesh.rings = 12
	var item := MeshInstance3D.new()
	item.name = label
	item.mesh = mesh
	item.material_override = material(color)
	item.position = center
	item.scale = dimensions
	parent.add_child(item)
	return item


func pivot(parent: Node3D, label: String, center: Vector3) -> Node3D:
	var result := Node3D.new()
	result.name = label
	result.position = center
	parent.add_child(result)
	return result


func stalk(parent: Node3D, label: String, start: Vector3, stop: Vector3, radius: float, color: Color) -> MeshInstance3D:
	var direction := stop - start
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius * .7
	mesh.bottom_radius = radius
	mesh.height = direction.length()
	mesh.radial_segments = 7
	var item := MeshInstance3D.new()
	item.name = label
	item.mesh = mesh
	item.material_override = material(color)
	item.position = (start + stop) / 2.0
	item.quaternion = Quaternion(Vector3.UP, direction.normalized())
	parent.add_child(item)
	return item


func make_model() -> Node3D:
	var creature := Node3D.new()
	creature.name = "Avilily"
	var dark := Color("244d4b")
	var leaf := Color("5fab69")
	var leaf_light := Color("aedb83")
	var feather := Color("3a8066")
	var cream := Color("e3efb5")
	var coral := Color("eaa17f")
	var petal_light := Color("f4c293")
	var beak_core := Color("6b4863")
	var talon := Color("c9a079")
	body = pivot(creature, "body_motion", Vector3.ZERO)
	ball(body, "body", Vector3(0, 0, 0), Vector3(.48, .69, .35), leaf)
	ball(body, "breast", Vector3(.18, -.04, .305), Vector3(.29, .48, .1), cream)
	ball(body, "belly_shadow", Vector3(-.26, -.25, -.05), Vector3(.16, .3, .28), feather)

	wing_back = pivot(body, "rear_wing", Vector3(-.27, .32, -.23))
	ball(wing_back, "rear_base", Vector3(-.28, .03, 0), Vector3(.42, .2, .11), feather)
	for i in 4:
		var f := ball(wing_back, "rear_feather_%s" % i,
			Vector3(-.63 - i * .08, .12 - i * .08, -.02),
			Vector3(.56 - i * .055, .115, .075), feather if i % 2 else leaf)
		f.rotation_degrees.z = -16 - i * 10
	ball(wing_back, "rear_ridge", Vector3(-.37, .1, .12), Vector3(.4, .055, .045), leaf_light).rotation_degrees.z = -10

	wing_front = pivot(body, "front_wing", Vector3(.26, .32, .31))
	ball(wing_front, "front_base", Vector3(.29, 0, 0), Vector3(.48, .19, .1), leaf)
	for i in 4:
		var f := ball(wing_front, "front_feather_%s" % i,
			Vector3(.64 + i * .08, .13 - i * .08, .01),
			Vector3(.57 - i * .055, .115, .075), leaf if i % 2 else feather)
		f.rotation_degrees.z = 16 + i * 10
	ball(wing_front, "front_ridge", Vector3(.46, .11, .13), Vector3(.43, .055, .045), leaf_light).rotation_degrees.z = 12

	for i in 2:
		var sx := -.18 - i * .14
		var ribbon := pivot(body, "streamer_%s" % i, Vector3(sx, .18, -.25 + i * .15))
		var feather_body := ball(ribbon, "long_feather", Vector3(-.2, -.72, 0),
			Vector3(.12, .86 - i * .12, .055), feather if i == 0 else leaf)
		feather_body.rotation_degrees.z = -19 + i * 7
		ball(ribbon, "streamer_light", Vector3(-.2, -.65, .052), Vector3(.025, .48, .018), leaf_light).rotation_degrees.z = -19 + i * 7
		streamers.append(ribbon)

	for i in 2:
		var foot_x := -.16 + i * .35
		stalk(body, "leg_%s" % i, Vector3(foot_x, -.51, .15), Vector3(foot_x + .04, -.84, .23), .065, talon)
		ball(body, "ankle_%s" % i, Vector3(foot_x + .04, -.83, .24), Vector3(.09, .08, .08), talon)
		for claw in 3:
			var claw_x := foot_x - .08 + claw * .08
			stalk(body, "talon_%s_%s" % [i, claw],
				Vector3(foot_x + .04, -.85, .23), Vector3(claw_x + .11, -.99, .39), .026, cream)

	head = pivot(body, "head_motion", Vector3(.14, .75, .07))
	ball(head, "head", Vector3(.03, .21, .02), Vector3(.42, .43, .34), leaf_light)
	ball(head, "cheek", Vector3(.26, .05, .14), Vector3(.18, .18, .16), leaf)
	for i in 3:
		var plume := ball(head, "crest_%s" % i, Vector3(-.16 + i * .13, .62 + .04 * (i % 2), -.02),
			Vector3(.075, .3 - .02 * i, .065), feather if i == 1 else leaf)
		plume.rotation_degrees.z = -18 + i * 17
	ball(head, "eye_white", Vector3(.24, .32, .306), Vector3(.105, .095, .045), cream)
	ball(head, "eye", Vector3(.278, .32, .352), Vector3(.045, .06, .026), dark)
	ball(head, "eye_glint", Vector3(.28, .35, .375), Vector3(.012, .013, .008), Color.WHITE)

	var mouth := pivot(head, "bloom_root", Vector3(.46, .1, .17))
	ball(mouth, "throat", Vector3(.075, 0, .05), Vector3(.18, .14, .12), beak_core)
	for i in 4:
		var petal := pivot(mouth, "petal_%s" % i, Vector3(.05, 0, .06))
		var shape := ball(petal, "petal_shape", Vector3(.19, 0, 0), Vector3(.31, .11, .085), petal_light if i % 2 else coral)
		shape.rotation_degrees.z = 0
		ball(petal, "vein", Vector3(.23, .055, .052), Vector3(.16, .018, .014), cream)
		petal_pivots.append(petal)
	return creature


func smooth(value: float) -> float:
	var x: float = clampf(value, 0.0, 1.0)
	return x * x * (3.0 - 2.0 * x)


func pose(seconds: float, action: bool) -> void:
	var open_amount := 0.0
	var spread := 0.0
	var anticipation := 0.0
	var rise := 0.0
	if action:
		anticipation = smooth((seconds - .13) / .27) * (1.0 - smooth((seconds - .40) / .18))
		rise = smooth((seconds - .4) / .25) * (1.0 - smooth((seconds - .82) / .38))
		open_amount = smooth((seconds - .46) / .22) * (1.0 - smooth((seconds - .83) / .25))
		spread = smooth((seconds - .38) / .26) * (1.0 - smooth((seconds - .84) / .31))
	body.position.y = -.13 * anticipation + .31 * rise + (0.01 * sin(seconds * 5.0) if not action else 0.0)
	body.rotation_degrees.z = -7.0 * anticipation + 7.0 * rise
	head.rotation_degrees.z = -9.0 * anticipation + 9.0 * rise
	wing_back.rotation_degrees.z = -22.0 * anticipation + 31.0 * spread + 2.0 * sin(seconds * 4.0)
	wing_front.rotation_degrees.z = 19.0 * anticipation - 31.0 * spread - 2.0 * sin(seconds * 4.0)
	for i in streamers.size():
		streamers[i].rotation_degrees.z = -7.0 * rise + 3.0 * sin(seconds * 6.0 + i)
	var angles := [-79.0, -23.0, 38.0, 90.0]
	for i in petal_pivots.size():
		petal_pivots[i].rotation_degrees.z = angles[i] * open_amount
		petal_pivots[i].position.z = .06 + .02 * i


func set_owner_recursive(scene_root: Node, parent: Node) -> void:
	for child in parent.get_children():
		child.owner = scene_root
		set_owner_recursive(scene_root, child)


func render_all() -> void:
	var viewport := SubViewport.new()
	viewport.size = Vector2i(SIZE, SIZE)
	viewport.transparent_bg = true
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	viewport.world_3d = World3D.new()
	root.add_child(viewport)
	var stage := Node3D.new()
	viewport.add_child(stage)
	model = make_model()
	stage.add_child(model)
	set_owner_recursive(model, model)
	var editable_scene := PackedScene.new()
	assert(editable_scene.pack(model) == OK)
	assert(ResourceSaver.save(editable_scene, "res://avilily_blockout.tscn") == OK)
	var camera := Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 4.3
	camera.position = Vector3(0, .35, 6)
	stage.add_child(camera)
	camera.look_at(Vector3(0, .32, 0))
	camera.current = true
	var sun := DirectionalLight3D.new()
	sun.light_energy = 1.25
	sun.rotation_degrees = Vector3(-30, -25, -15)
	stage.add_child(sun)
	var fill := DirectionalLight3D.new()
	fill.light_energy = .45
	fill.rotation_degrees = Vector3(20, 155, 15)
	stage.add_child(fill)
	var world := WorldEnvironment.new()
	var environment := Environment.new()
	environment.background_mode = Environment.BG_CLEAR_COLOR
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color(.85, .93, 1.0)
	environment.ambient_light_energy = .55
	world.environment = environment
	stage.add_child(world)
	for clip in ["idle", "action"]:
		var fps := 12 if clip == "idle" else 24
		var count := 12 if clip == "idle" else 30
		var folder := ProjectSettings.globalize_path("res://../rendered3d/%s" % clip)
		DirAccess.make_dir_recursive_absolute(folder)
		for i in count:
			pose(float(i) / fps, clip == "action")
			await RenderingServer.frame_post_draw
			var result := viewport.get_texture().get_image()
			if result.save_png(folder.path_join("%03d.png" % i)) != OK:
				push_error("Could not save 3D frame %s/%s" % [clip, i])
				quit(1)
		print("Rendered 3D %s: %s frames" % [clip, count])
	viewport.queue_free()
	quit()
