
export class ParametricClass {
    constructor (o) {
        if (o) for ( const k in o ) this[k] = o[k];
    }
}

export class Axiom extends ParametricClass {
    static create = name => new this({ name });
    installInProto () {}
}
export class MethodAxiom extends Axiom {
    static create = (name, fn) => new this({ name, fn });
    installInProto (proto) {
        proto[this.name] = this.fn;
    }
}

export class PropertyBehaviour extends ParametricClass {
    set (ins, value, save) {
        if ( this.async ) {
            return { async: true, promise: this.asyncSet_(ins, value, save) };
        }
        return { async: false, finalValue: this.syncSet_(ins, value, save) };
        
    }
    syncSet_ (ins, value, save) {
        if ( this.adapt ) value = this.adapt(value);
        save(value);
    }
    async asyncSet_ (ins, value, save) {
        if ( this.adapt ) value = await this.behaviour.adapt(value);
        save(value);
    }
}

export class BooleanBehaviour extends PropertyBehaviour {
    adapt (val) {
        return !! val;
    }
}

export class PropertyAxiom extends Axiom {
    static builtinBehaviours = [
        {
            predicate: v => v === true || v === false,
            cls: BooleanBehaviour
        },
        {
            predicate: () => true,
            cls: PropertyBehaviour
        }
    ]
    
    static create = (name, behaviourOrValue) => {
        const behaviour = behaviourOrValue instanceof PropertyBehaviour
            ? behaviourOrValue
            : this.getAppropriateBehaviourForValue(behaviourOrValue);
        return new this({ name, behaviour });
    }

    static getAppropriateBehaviourForValue (value) {
        if ( typeof value === 'object' ) {
            if ( Array.isArray(value) ) {
                throw new Error('arrays are not valid - please use a factory');
            }

            return new PropertyBehaviour(value);
        }

        for ( const builtinBehaviour of this.builtinBehaviours ) {
            if ( ! builtinBehaviour.predicate(value) ) continue;
            const behaviourClass = builtinBehaviour.cls;
            const behaviour = new behaviourClass();
            return behaviour;
        }
    }

    installInProto (proto) {
        const prop = this;
        Object.defineProperty(proto, this.name, {
            set: function (value) {
                prop.set(this, value);
            },
            get: function () {
                return prop.get(this);
            }
        })
    }
    //
    set (ins, value) {
        let returnValue;
        const apply = this.setApply_.bind(this, ins, v => returnValue = v);
        const result = this.behaviour.set(ins, value, apply);
        if ( ! result.async ) return result;
        result.promise = result.promise.then(() => returnValue);
        return result;
    }
    setApply_ (ins, next, value) {
        ins.__spume__.values[this.name] = value;
        next(value);
    }
    get (ins) {
        return ins.__spume__.values[this.name];
    }
}

export class SpumeModel {
    static builtinAxioms = [
        {
            predicate: v => typeof v === 'function',
            cls: MethodAxiom,
        },
        {
            predicate: v => false
                || v instanceof PropertyBehaviour
                || v === true || v === false
                || v === null || v === undefined
                || typeof v === 'number'
                || typeof v === 'string',
            cls: PropertyAxiom,
        },
        {
            predicate: () => true,
            cls: Axiom
        }
    ];

    constructor (model) {
        this.model = model;
    }
    toClass () {
        const cls = function () {
            this.__spume__ = {};
            this.__spume__.values = {};
        };
        for ( const k in this.model ) {
            const val = this.model[k];
            for ( const builtinAxiom of this.constructor.builtinAxioms ) {
                if ( ! builtinAxiom.predicate(val) ) continue;
                const axiomClass = builtinAxiom.cls;
                const axiom = axiomClass.create(k, val);
                axiom.installInProto(cls.prototype);
            }
        }
        return cls;
    }
}

export function CLASS (model) {
    if ( ! ( model instanceof SpumeModel ) ) {
        model = new SpumeModel(model);
    }
    return model.toClass();
}

export const SpecProp = CLASS({
    adapt (v) {
        if ( v.constructor !== 'Object' ) return v;
        return new this.of(v);
    }
});
