
# Texture Atlasing in Bevy 
 

 Follow the full gist here: [Texture Atlas Gist for Bevy](https://gist.github.com/ethereumdegen/0b2c99677e710d32ae494dd7e735e6f0)

###  Creating Spritesheets from Textures in Bevy using bevy_asset_loader

In this tutorial, we'll learn how to create spritesheets from textures loaded from folders using the bevy_asset_loader crate in Rust with the Bevy game engine.   

First, this assumed you are loading your textures from bevy_asset_loader like this .   

```



 .load_collection::<TextureAssets>()

 ...



#[derive(AssetCollection, Resource, Clone)]
pub(crate) struct TextureAssets {
   

    #[asset(path = "textures/gui_pixel_icons", collection(typed, mapped) , image(sampler = nearest) )] 
    pub(crate) gui_pixel_icons: HashMap<AssetFileName, Handle<Image>>,

    #[asset(path = "textures/ability_icons", collection(typed, mapped) , image(sampler = linear) )]
    //or linear.. doesnt work ?
    pub(crate) ability_icons: HashMap<AssetFileName, Handle<Image>>,

    #[asset(path = "textures/item_icons", collection(typed, mapped) , image(sampler = linear) )]
    //or linear.. doesnt work ?
    pub(crate) item_icons: HashMap<AssetFileName, Handle<Image>>,
 
}


```

After all of your textures have been loaded like this, you need to run a one-shot function that will build a spritesheet from all of the separate images and build a hashmap lookup table to go from original_file_name -> texture atlas index.  This will be important later. You can use the build() fn below : 





 ```





impl TextureAtlasAssets {
    pub fn build(
        mut commands: Commands,
        texture_assets: Res<TextureAssets>,
        mut texture_atlases: ResMut<Assets<TextureAtlasLayout>>,
        mut images: ResMut<Assets<Image>>,
    ) {
        // Assume defaults for padding and sampling, adjust as needed
        let padding = Some(UVec2::new(2, 2));

        let gui_pixel_icons_atlas = build_texture_atlas(
            &texture_assets.gui_pixel_icons,
            Some(Vec2::new(2048., 2048.)),
            padding,
            &mut texture_atlases,
            &mut images,
        );

        let ability_icons_atlas = build_texture_atlas(
            &texture_assets.ability_icons,
            Some(Vec2::new(2048., 2048.)),
            padding,
            &mut texture_atlases,
            &mut images,
        );

        let item_icons_atlas = build_texture_atlas(
            &texture_assets.item_icons,
            Some(Vec2::new(2048., 2048.)),
            padding,
            &mut texture_atlases,
            &mut images,
        );

        // Store the handles in new resource
        commands.insert_resource(TextureAtlasAssets {
            gui_pixel_icons_atlas: Some(gui_pixel_icons_atlas),
            ability_icons_atlas: Some(ability_icons_atlas),
            item_icons_atlas: Some(item_icons_atlas),
        });
    }
}


 ```


This method calls the build_texture_atlas function for each category of assets in your game, passing in the loaded textures, max size, padding, and the necessary resources to build a combined spritesheet. It then stores the resulting texture atlas handles in the TextureAtlasAssets resource.


```
pub fn build_texture_atlas(
    handles: &HashMap<AssetFileName, Handle<Image>>,
    max_size: Option<Vec2>,
    padding: Option<UVec2>,
    texture_atlases: &mut ResMut<Assets<TextureAtlasLayout>>,
    images: &mut ResMut<Assets<Image>>,
) -> TextureAtlasCombined {
    let mut texture_atlas_builder = TextureAtlasBuilder::default()
        .max_size(max_size.unwrap_or(Vec2::new(2048., 2048.)))
        .padding(padding.unwrap_or(UVec2::ZERO));

    for (icon_name, handle) in handles.iter() {
        if let Some(texture) = images.get(handle) {
            texture_atlas_builder.add_texture(Some(handle.clone_weak().into()), texture);
        } else {
            panic!(
                "Texture handle did not resolve to an `Image` asset: {:?}",
                icon_name
            );
        }
    }

    let (texture_atlas, image) = texture_atlas_builder
        .finish()
        .expect("Failed to build texture atlas.");

    let texture_atlas_handle = texture_atlases.add(texture_atlas);
    let image_handle = images.add(image);

    TextureAtlasCombined {
        layout: texture_atlas_handle,
        image: image_handle,
    }
}

```


This function takes the image handles, max size, padding, and the necessary resources as input. It creates a TextureAtlasBuilder, sets the max size and padding, and iterates over the image handles to add each texture to the atlas. It then finishes building the atlas, creates handles for the atlas layout and image, and returns a TextureAtlasCombined struct containing those handles.




```

pub fn get_index_for_subtexture_by_name(
    texture_atlas_handle: &Handle<TextureAtlasLayout>,
    texture_atlases: &Res<Assets<TextureAtlasLayout>>,
    image_handles_map: &HashMap<AssetFileName, Handle<Image>>,
    texture_name: &String,
) -> Option<usize> {
    if let Some(atlas) = texture_atlases.get(texture_atlas_handle) {
        if let Some(image_handle) = image_handles_map.get(texture_name.as_str()) {
            return atlas.get_texture_index(image_handle);
        }
    }
    None
}

```

This function takes the texture atlas handle, the TextureAtlasLayout assets, the image handles map, and the texture name as input. It retrieves the texture atlas layout and looks up the image handle in the map. If both are found, it returns the index of the subtexture in the atlas.  This is used in Ui components code as seen below.  


```

#[derive(Component, Default)]
pub struct UiIconComponent {
    pub icon_source: Option<UiIconSource>,
  
}

impl UiIconComponent {

    pub fn new (icon_source: Option<UiIconSource> ) -> Self  {

        Self {
            icon_source
        }   

    }
}


```

This component should be inserted to any TextureAtlasBundle in your UI.  This system named update_icons_from_source will loop through every entity who has the UiIconComponent and the TextureAtlas (and UIImage) components and will write to the texture atlas render data accordingly.  



```

fn update_icons_from_source(
    mut image_node_query: Query<
        (&mut Visibility, &mut TextureAtlas, &mut UiImage,  &UiIconComponent),
        Changed<UiIconComponent>,
    >,

    ability_system_type_assets: Res<AbilitySystemTypeAssets>,

    item_system_type_assets: Res<ItemSystemTypeAssets>,
    
    item_types: Res<Assets<ItemType>>,
    ability_types: Res<Assets<AbilityType>>,

    texture_atlases: Res<Assets<TextureAtlasLayout>>,

    texture_atlas_assets: Res<TextureAtlasAssets>,

    images: Res<TextureAssets>,
) {
    //render equipped stuff like weapons that are on you !!

    for (mut _visibility, mut tex_atlas, mut ui_image,   ui_icon_comp) in image_node_query.iter_mut() {
   
        .....
            -- your own custom code goes here --

        ...

        let Some(image_index) = get_index_for_subtexture_by_name(
            &texture_atlas.layout,
            &texture_atlases,
            &icons_handles_map,
            &icon_name,
        ) else {
            continue;
        };

        ui_image.texture = texture_atlas.image.clone();


        tex_atlas.layout = texture_atlas.layout.clone();
        tex_atlas.index = image_index;



    }
    }

```


Now you can easily render Icons in your game from texture spritesheets ! 