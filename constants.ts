
export const PAIRING_OPTIONS: Record<string, Record<string, Record<string, string[]>>> = {
  'Blanco': {
    'Marisco': {
      'Popular': ['Gambas', 'Langostinos', 'Mejillones', 'Almejas'],
      'Premium': ['Ostras', 'Vieiras', 'Cigalas', 'Bogavante', 'Percebes']
    },
    'Pescado': {
      'Blanco': ['Merluza', 'Lubina', 'Dorada', 'Bacalao'],
      'Azul/Ahumado': ['Salmón ahumado', 'Atún', 'Sardinas']
    },
    'Quesos frescos': {
      'Suaves': ['Mozzarella', 'Queso de cabra', 'Burrata', 'Ricotta'],
      'Intensos': ['Feta', 'Queso azul suave']
    },
    'Vegetariano': {
      'Verduras': ['Espárragos', 'Alcachofas', 'Berenjenas'],
      'Ensaladas': ['Ensalada mediterránea', 'Ensalada César', 'Ensalada de pasta']
    }
  },
  'Tinto': {
    'Carnes': {
      'Popular': ['Chuletón', 'Cordero', 'Costillas', 'Hamburguesa gourmet'],
      'Premium': ['Caza', 'Cochinillo', 'Solomillo', 'Chuleta de buey']
    },
    'Embutidos': {
      'Curados': ['Jamón ibérico de bellota', 'Lomo ibérico', 'Cecina de León'],
      'Grasos': ['Morcilla de Burgos', 'Chorizo riojano', 'Salchichón']
    },
    'Quesos curados': {
      'Oveja': ['Manchego', 'Idiazábal ahumado', 'Pecorino'],
      'Fuerte': ['Cabrales', 'Roquefort', 'Gorgonzola']
    },
    'Guisos': {
      'Carne': ['Rabo de toro', 'Carrillera', 'Cocido', 'Estofado de ternera'],
      'Legumbres': ['Fabada asturiana', 'Lentejas con chorizo']
    }
  },
  'Rosado': {
    'Tapas': {
      'Frías': ['Jamón', 'Anchoas', 'Aceitunas', 'Ensaladilla'],
      'Calientes': ['Croquetas', 'Tortilla', 'Bravas']
    },
    'Ensaladas': {
      'Proteína': ['Con atún', 'Con pollo', 'Con salmón'],
      'Vegetal': ['Mediterránea', 'De tomate y ventresca']
    },
    'Pescados y mariscos': {
      'Marisco': ['Gambas', 'Mejillones', 'Berberechos'],
      'Pescado': ['Lubina', 'Dorada', 'Salmón']
    }
  },
  'Espumoso/Cava': {
    'Aperitivo premium': {
      'Mar': ['Ostras', 'Caviar', 'Salmón ahumado'],
      'Tierra': ['Jamón ibérico de bellota', 'Foie', 'Steak tartar']
    },
    'Tapas': {
      'Frituras': ['Tempura', 'Fritura de pescado', 'Calamares'],
      'Clásicas': ['Croquetas', 'Gildas', 'Montaditos']
    }
  }
};

export const GRAPE_VARIETIES: Record<string, string[]> = {
  'Blanco': ['Albariño', 'Verdejo', 'Macabeo', 'Airén', 'Palomino', 'Godello', 'Viura', 'Garnacha Blanca', 'Moscatel', 'Gewürztraminer'],
  'Tinto': ['Tempranillo', 'Garnacha', 'Monastrell', 'Mencía', 'Bobal', 'Graciano', 'Mazuelo', 'Prieto Picudo', 'Cabernet Sauvignon', 'Syrah'],
  'Rosado': ['Tempranillo', 'Garnacha', 'Monastrell', 'Mencía', 'Bobal', 'Graciano', 'Mazuelo', 'Prieto Picudo', 'Cabernet Sauvignon', 'Syrah'],
  'Espumoso/Cava': ['Macabeo', 'Xarel·lo', 'Parellada', 'Chardonnay', 'Pinot Noir', 'Subirat Parent']
};
