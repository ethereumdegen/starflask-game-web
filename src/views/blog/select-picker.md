
# Bevy Advanced UI Pattern : Selection Picker 
 
 
 In this blog post I will explain how I built the horizontal selection picker component in my ui. 



![Alt Text](/blog/picker.gif)



This is how simple it is to define a horizontal choice picker.   As you can see, it only takes about 10 lines of code to define it.  I just have to use the bevy_hammer_ui builder pattern for the picker and then in the inner function I have to spawn selectable choices as children, each of them having a boxed Event.  That event is output whenever the selector component selects that entry.   Simple! 
 
 ```



           let hair_color_choices = vec![ 
  
  

                 (
                    ChoicePreviewType::TextLabel( "Storm Gray".to_string()  ), 
                   SelectCharacterAppearanceEvent:: SelectAppearanceColorTint(  AppearanceColorSlotType::Hair,  "StormGray".into()   )  
               )  ,

                   (
                    ChoicePreviewType::TextLabel( "Peach".to_string()  ), 
                   SelectCharacterAppearanceEvent:: SelectAppearanceColorTint(  AppearanceColorSlotType::Hair,  "Peach".into()   )  
               ),


               (
                    ChoicePreviewType::TextLabel( "Autumn".to_string()  ), 
                   SelectCharacterAppearanceEvent:: SelectAppearanceColorTint(  AppearanceColorSlotType::Hair,  "Autumn".into()   )  
               ),


            ];

             inner.horizontal_choice_picker( 
                |choice_root| {

                    for c in hair_color_choices {
                            //when this choice is selected, this event is output.  ! 
                        choice_root.selectable_choice (
                               c.0, //select label 
                              Box::new( SelectableChoiceWithEventOutput { event: c.1.clone()  } //event to output on select
                         )

                        ) ;
                    }

                }
                

             );



 ```



 This is the widget code for the horizontal choice picker, again using vanilla Bevy Ui and the extremely minimal framework bevy_hammer_ui.   


 ```



use std::any::Any;
use crate::ui::components::button_interact_component::ButtonInteractionTriggerOutput;
use crate::ui::prefabs::hoverable_button::HoverableButtonConfig;
use crate::ui::components::button_interact_component::ButtonPressInteractComponent;
use crate::ui::components::button_interact_component::ButtonInteractionEventOutput;
use crate::ui::prefabs::container::UiContainerExt;
use crate::ui::prefabs::label_widget::LabelConfig;
use crate::ui::prefabs::label_widget::UiLabelExt;
use crate::ui::ui_extensions::SetLabelTextCustomExt;
use crate::ui::ui_extensions::SetUiFontExt;
use crate::ui::ui_styles::*;
use bevy_hammer_ui::style::UiStyleExt;
use bevy_hammer_ui::ui_builder::UiBuilder;

use crate::ui::ui_extensions::SetUiTextureImageExt;

use bevy::prelude::*;

use super::hoverable_button::UiHoverableButtonExt;

use bevy::utils::HashMap; 
  

/*


TODO: 

  allow for multiple choices (only render the selected one)  
  make the arrows  look better 


  implement SelectedChoiceRenderPreview 

*/

pub(crate) fn horizontal_choice_picker_plugin(app: &mut App) {
    app


     .add_event::< ChoicePickerEvent  >()
     .add_event::< ChoiceSelected  >()

    .add_observer(  handle_choice_picker_event_triggers  )
    .add_observer(  handle_choice_selected  )


      .add_systems( Update  , 


         (  

            register_updated_children  ,
            handle_choice_picker_selection_updated,

            update_render_preview, 
 
          ) .chain () 
       

        )

    ;
}




#[derive(Event,Clone,Debug )] 
  enum ChoicePickerEvent {

    IncrementChoice(usize) , 

}



#[derive(Event,Clone,Debug )] 
  struct ChoiceSelected  ; //trigger on the choice 



#[derive(Component) ]
  struct ChoicesRootNode;

#[derive(Component) ]
struct  SelectedChoiceRenderPreview; 

#[derive(Component,Default )]
pub struct HorizontalChoicePicker   {

     pub registered_choices: HashMap< usize, Entity >, 

     pub selected_choice_index: usize   //starts at 0 


}


impl HorizontalChoicePicker {

    pub fn increment_index(&mut self, increment: usize) {
        if !self.registered_choices.is_empty() {
            self.selected_choice_index =
                (self.selected_choice_index + increment) % self.registered_choices.len();
        }
    }

    pub fn get_current_selection(&self) -> Option<&Entity> {

        self.registered_choices.get(  &self.selected_choice_index )
    }


}


//attach these as children 

#[derive(Component)]
pub struct SelectableChoice {
  //  pub label: String, 
    pub output: Box<  dyn SelectableChoiceOutputExt +   Send + Sync + 'static >

}


#[derive(Component,Clone,Debug)] 
pub enum ChoicePreviewType{

    TextLabel (String) ,
    Color( Color)  , 

}
 

fn get_text_render_bundle( label_text: &String ) -> impl Bundle  {

    return  (
          Visibility::default(),

          Text::new(label_text)

          )

}


fn get_color_render_bundle( color: &Color) -> impl Bundle {


    return (
                  Visibility::default(),
                Node {
                    min_width: Val::Px( 20.0 ),
                    min_height: Val::Px( 20.0 ), 

                    ..default()
                }, 
                BackgroundColor (  *color  ),


         ) 


}


#[derive(Component)]
pub struct ChoiceRenderPreviewLink ( Entity ) ;

pub trait SelectableChoiceExt {
    fn selectable_choice  (

        &mut self, 
        choice_preview: ChoicePreviewType,
        output: Box<  dyn SelectableChoiceOutputExt +   Send + Sync + 'static > 

        ) -> UiBuilder<Entity>;
}

impl SelectableChoiceExt for UiBuilder<'_, Entity> {
     fn selectable_choice  (

        &mut self, 
        choice_preview: ChoicePreviewType,
        output: Box<  dyn SelectableChoiceOutputExt +   Send + Sync + 'static > 

        ) -> UiBuilder<Entity> {

      
        let   ui_builder = self.spawn(

            (
            Name::new( format!( "selectable choice  "   )),
            SelectableChoice {
                output 
            },

            choice_preview.clone(), 

           // Text::new( label.to_string() )

            )

            ) ;
 

        ui_builder

     }
}




pub trait SelectableChoiceOutputExt {
    fn on_choice_selected(&self, commands: &mut Commands ,  _interacted_entity: &Entity );
}



/// When the choice is selected, this generic event T will be emitted 
pub struct  SelectableChoiceWithEventOutput<T>
where
    T: Event + Clone, // Ensure T can be used as an Event and is Cloneable
{
    pub event: T,
}





impl<T> SelectableChoiceOutputExt for SelectableChoiceWithEventOutput<T>
where
    T: Event + Clone,
{
    fn on_choice_selected(&self, commands: &mut Commands, _interacted_entity: &Entity) {
        let event_to_emit = &self.event;

        let event_cloned = event_to_emit.clone();

        commands.send_event(event_cloned);
    }
}





pub trait UiHorizontalChoicePickerExt {
    fn horizontal_choice_picker  (

        &mut self, 
       // bundle: impl Bundle,
        spawn_children: impl FnOnce(&mut UiBuilder<Entity>),

        ) -> UiBuilder<Entity>;
}

impl UiHorizontalChoicePickerExt for UiBuilder<'_, Entity> {
    fn horizontal_choice_picker (
        &mut self,  
        //  bundle: impl Bundle,
        spawn_choices: impl FnOnce(&mut UiBuilder<Entity>),
        ) -> UiBuilder<Entity> {





        self.container( (


            Node { 

                   display: Display::Flex,
                 
                    flex_direction: FlexDirection::Row, // Set direction to column for vertical layout
                    justify_content: JustifyContent::FlexStart, // Adjust main axis  distribution as needed
                    align_items: AlignItems::FlexStart, // Adjust cross axis alignment as needed (center, flex-end, etc.)



                  ..default()

             }, 

            HorizontalChoicePicker::default(),

            Name::new("choice picker") ,



        ), |inner| {


                
            let picker_entity_id = inner.id(); 





              //This gets modulated !  
              let render_choice_preview = inner.spawn(   (
                   Node {

                    margin: UiRect::horizontal( Val::Px( 8.0 )),
                    padding: UiRect::horizontal( Val::Px( 8.0 )) ,
                    min_width: Val::Px( 160.0  ), 
                    ..default()

                    },
                    Visibility::default() ,
                    SelectedChoiceRenderPreview  , 

                )  ).id()  ;

              
              
              inner.insert(   ChoiceRenderPreviewLink(  render_choice_preview )  );  


             //is this a good way to do it ? 
            let choices_root_entity = inner.container( 
                (
                  Visibility::Hidden ,
                 ChoicesRootNode , 

                ),  
               
                spawn_choices
             ); 






             inner.hoverable_button(  HoverableButtonConfig {
                    bg_texture: Some( "crusader_arrow_iron.png".to_string() )  ,
                    max_dimensions: Vec2 ::new( 22.0, 22.0 ),
                    label: None , 
 
                 }  )

                 .insert(
                    ButtonPressInteractComponent(Some(Box::new(
                        ButtonInteractionTriggerOutput {
                            event_trigger: ChoicePickerEvent::IncrementChoice( 1 ),
                            target_entity: Some( picker_entity_id  )
                        },
                    )))


                ) 
                 ;


        }) 

        
      }
}



fn register_updated_children(


    choices_root_node_query: Query<  (Entity,   &Children,  &Parent) , (With<ChoicesRootNode> , Changed<Children>) > ,
    mut picker_query: Query<    &mut HorizontalChoicePicker     >


) {

    
    for (choices_root_entity, children, parent) in choices_root_node_query.iter(){

        let picker_parent = parent.get();

        let Some( mut choice_picker) = picker_query.get_mut( picker_parent ).ok() else {
            warn!("choices root node children changed but parent was invalid" );
            continue
        }; 

        let mut new_hashmap = HashMap::new(); 


        for (i, child) in children.into_iter().enumerate() {

            new_hashmap.insert(i , *child) ;

        }

          info!( "updated picker hashmap {:?}" , new_hashmap  );

        choice_picker.registered_choices = new_hashmap;
        choice_picker.selected_choice_index = 0; 
 

    } 


}






fn handle_choice_picker_event_triggers(

    trigger: Trigger< ChoicePickerEvent >,

    mut choice_picker_query: Query< &mut HorizontalChoicePicker  >

){


    let entity = trigger.entity();
    let evt = trigger.event(); 
    info!("choice picker event ! {:?} {} ",  evt , entity );


    if let Some( mut choice_picker ) = choice_picker_query.get_mut( entity ).ok() {

        match evt {
            ChoicePickerEvent::IncrementChoice(delta) =>  choice_picker.increment_index(  *delta  )  ,
        }
        

    }

}



fn handle_choice_picker_selection_updated(

    mut commands:Commands ,

      choice_picker_query: Query< & HorizontalChoicePicker , Changed<HorizontalChoicePicker> >

    ){
     for choice_picker in choice_picker_query.iter(){
 

        if let Some( currently_selected_choice) = choice_picker.get_current_selection() {

              info!("choice selected 1!  {} ",  currently_selected_choice);

              commands.trigger_targets( ChoiceSelected  , * currently_selected_choice );
        }
 

    }

}


fn handle_choice_selected(  // this is not  working .. 
   

    trigger: Trigger<ChoiceSelected> ,

    choice_query: Query< (Entity,  &SelectableChoice ) >,

     mut commands: Commands, 


){  


    let Some((choice_entity, choice)) = choice_query.get(  trigger.entity() ) .ok() else {
            warn!(  "handle choice selected failed: the triggered entity doesnt have SelectableChoice ");
        return 
    } ;

    let choice_output = &choice.output; 

       info!( "choice selected 2: {} " , &choice_entity );
    choice_output.on_choice_selected(&mut commands, &choice_entity); 

 

}
 

fn update_render_preview(

     mut commands:Commands ,

     choice_picker_query: Query< (& ChoiceRenderPreviewLink, &HorizontalChoicePicker) , Changed<HorizontalChoicePicker> >,

     selection_query: Query<  &ChoicePreviewType  >  

){
  for (render_preview_link , choice_picker ) in choice_picker_query.iter(){
 

  let render_preview_entity = render_preview_link.0; 

    if let Some( currently_selected_choice_entity  ) = choice_picker.get_current_selection() {


        if let Some( choice_preview ) = selection_query.get(  *currently_selected_choice_entity ).ok() {

            if let Some(mut cmd) = commands.get_entity(render_preview_entity) {

                cmd.despawn_descendants() ;
 
      
               match choice_preview {
                    ChoicePreviewType::TextLabel(label) => {
                        cmd.with_child(   

                                    get_text_render_bundle (label)
                         ); 
                    },
                    ChoicePreviewType::Color(color) => {
                         cmd.with_child(   
                                    get_color_render_bundle(color)
                          ); 
                    },
                } ;
              

            }
        }
         

         // commands.trigger_targets( ChoiceSelected  , * currently_selected_choice );
    }


  }

}


 ```



So as you can see, the general idea here is each choice is a 'child entity' which gets spawned under the hidden 'ChoicesRootNode'  which is a child of the selection picker container.   

When the arrow button is clicked, that triggers an Increment event on the horizontal picker which mutates its selection index .   As that mutates, the 'choice render preview' is updated to render the render_data of the currently selected choice entity and when this occurs, the event corresponding to that selection choice is emitted as well.   

And that is it !   




### Extras 


 Here is button press interact component if you would like to see how I build the button: 

https://gist.github.com/ethereumdegen/7d542ca7a825960807f79e1a898020f0



